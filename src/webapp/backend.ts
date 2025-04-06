import { Orchestrator } from "../orchestrator";
import { Install } from "../install";
import { Log } from "../checks/log";
import { CalendarAlg } from "../defrag/calendar-alg";
import { GreedyDefrag } from "../defrag/greedy-defrag";
import { UserSettings } from "../checks/user-settings";
import { GetEvents } from "../checks/get-events";
import { EventUtil } from "../checks/event-util";
import { get } from "lodash";
import { CalendarCost } from "../defrag/calendar-cost";

interface DefragResult {
  startingEvents: GoogleAppsScript.Calendar.Schema.Event[];
  solution: GreedyDefrag.Solution;
}

interface UIDefragResult {
  startingEvents: GoogleAppsScript.Calendar.Schema.Event[];
  solutionEvents: GoogleAppsScript.Calendar.Schema.Event[];
  moveableMeetingIds: string[];
  unplaceableMeetingIds: string[];
  consoleLog: string;
}

interface DefragPendingCommit {
  updatedDate: string;
  weekDate: string;
  selectedMeetingIds: string[];
  defragResult: DefragResult;
}

// Helper functions to manage cache
function getCache(): GoogleAppsScript.Cache.Cache {
  return CacheService.getUserCache();
}

function setPendingSession(session: DefragPendingCommit): void {
  const cache = getCache();

  // Clone the session and convert Map and Set to arrays
  const sessionClone = {
    ...session,
    defragResult: {
      ...session.defragResult,
      solution: {
        ...session.defragResult.solution,
        timings: Array.from(session.defragResult.solution.timings.entries()), // Convert Map to Array
        unplaceableEventIds: Array.from(
          session.defragResult.solution.unplaceableEventIds
        ), // Convert Set to Array
      },
    },
  };

  const serializedSession = JSON.stringify(sessionClone);
  const compressedSession = Utilities.gzip(
    Utilities.newBlob(serializedSession, "application/json")
  ).getBytes();
  const encodedSession = Utilities.base64Encode(compressedSession);

  cache.put("pendingSession_v2", encodedSession, 900); // 15 minutes
}

function getPendingSession(): DefragPendingCommit | undefined {
  const cache = getCache();
  const session = cache.get("pendingSession_v2");
  if (session === undefined || session === null || session.trim() === "") {
    return undefined;
  }

  let jsonData;
  try {
    const decompressedData = Utilities.ungzip(
      Utilities.newBlob(
        Utilities.base64Decode(session as string),
        "application/x-gzip"
      )
    ).getDataAsString();
    jsonData = JSON.parse(decompressedData);
  } catch (error) {
    console.error("Failed to parse cached session:", error);
    return undefined;
  }

  // Log the deserialized timings to verify format
  console.log("Deserialized timings:", jsonData.defragResult.solution.timings);

  // Reconstruct Map and Set
  const timingsArray: [string, any][] = jsonData.defragResult.solution.timings;
  const timingsMap = new Map<string, CalendarCost.EventTiming>(timingsArray);

  const unplaceableEventIdsArray: string[] =
    jsonData.defragResult.solution.unplaceableEventIds;
  const unplaceableEventIdsSet = new Set<string>(unplaceableEventIdsArray);

  return {
    updatedDate: jsonData.updatedDate,
    weekDate: jsonData.weekDate,
    selectedMeetingIds: jsonData.selectedMeetingIds,
    defragResult: {
      startingEvents: jsonData.defragResult.startingEvents,
      solution: {
        timings: timingsMap,
        unplaceableEventIds: unplaceableEventIdsSet,
      },
    },
  };
}
function clearPendingSession(): void {
  const cache = getCache();
  cache.remove("pendingSession_v2"); // Use the correct key
}

// Handle GET requests
function doGet(e: GoogleAppsScript.Events.DoGet) {
  const page = e.parameter.page;
  let templateFile = "src/webapp/Index";

  if (page === "defrag") {
    templateFile = "src/webapp/defrag";
  }

  if (page === "download") {
    templateFile = "src/webapp/download";
  }

  const template = HtmlService.createTemplateFromFile(templateFile);
  const userSettings = UserSettings.loadSettings();
  template.userSettings = userSettings;
  return template
    .evaluate()
    .setTitle("Calendar Automation")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Helper function for HTML templates to include other files
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function serializeInputs(inputs) {
  return {
    myEvents: mapToObject(inputs.myEvents),
    myEventsList: inputs.myEventsList, // Assuming this is already serializable
    myWorkingHours: inputs.myWorkingHours, // Ensure this is serializable
    theirEvents: mapToObject(inputs.theirEvents),
    theirWorkingHours: mapToObject(inputs.theirWorkingHours),
    moveableEvents: setToArray(inputs.moveableEvents),
    moveableEventTimings: mapToObject(inputs.moveableEventTimings),
    recurrenceSchedule: mapToObject(inputs.recurrenceSchedule),
  };
}

function getDefragInputsForDownload() {
  const inputs = CalendarAlg.getInputs(new Date("2024-09-30"));
  const serializedInputs = serializeInputs(inputs);
  return serializedInputs;
}

function mapToObject(map) {
  const obj = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

function setToArray(set) {
  return Array.from(set);
}

// Update user settings
function onSettingsChanged(newSettings: UserSettings.Settings): {
  success: boolean;
  message: string;
} {
  const oldSettings = UserSettings.loadSettings();
  if (!oldSettings.enabled && newSettings.enabled) {
    Log.log(
      "Old settings were disabled, new settings say enabled, installing triggers"
    );
    Install.setupTriggers();
  } else if (oldSettings.enabled && !newSettings.enabled) {
    Log.log(
      "Old settings were enabled, new settings say disabled, uninstalling triggers"
    );
    Install.removeAllTriggers();
  }

  // Log the incoming settings
  console.log("Received new settings:", JSON.stringify(newSettings));

  // Save the settings
  UserSettings.saveSettings(newSettings);
  console.log("Settings updated successfully");

  return { success: true, message: "Settings updated successfully" };
}

// Fetch events for a specific week
function getEventsForWeek(date: string): {
  events: GoogleAppsScript.Calendar.Schema.Event[];
  moveableMeetingIds: string[];
} {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const events = GetEvents.getEventsForDateRange(startDate, endDate).filter(
    (event) => !EventUtil.didIRSVPNo(event) && event.eventType !== "focusTime"
  );

  // Determine moveable meetings based on your criteria
  // For example, meetings created by the user and not marked as non-moveable
  const moveableMeetingIds = events
    .filter((event) => CalendarAlg.isEventEligibleForDefragSelection(event))
    .map((event) => event.id!);

  return { events, moveableMeetingIds };
}

// Defragment the calendar based on selected meetings
function defrag(date: string, selectedMeetingIds: string[]): UIDefragResult {
  let events: GoogleAppsScript.Calendar.Schema.Event[] = [];
  let unplaceablEventIds: Set<string> = new Set();
  let moveableMeetingIds: Set<string> = new Set();
  let solutionTimings: Map<string, CalendarCost.EventTiming> = new Map();
  let logMessages: string[] = [];

  // TODO decide if i want to keep this
  clearPendingSession();

  const session = getPendingSession();
  if (
    session !== undefined &&
    session.weekDate === date &&
    new Date(session.updatedDate).getTime() - new Date().getTime() <
      1000 * 60 * 15
  ) {
    Log.log("Using cached defrag result");
    events = session.defragResult.startingEvents;
    unplaceablEventIds = session.defragResult.solution.unplaceableEventIds;
    moveableMeetingIds = new Set(session.selectedMeetingIds);
    solutionTimings = session.defragResult.solution.timings;
    logMessages = [];
  } else {
    Log.log("Calculating defrag result");
    const inputs = CalendarAlg.getInputs(new Date(date));

    // make inputs.moveableEvents the intersection of existing moveable events and selected meetings
    inputs.moveableEvents = new Set(
      selectedMeetingIds.filter((id) => inputs.moveableEvents.has(id))
    );

    const logMessagesTemp: string[] = [];
    Log.hook = (entry: string) => {
      logMessagesTemp.push(entry);
    };
    const solution = GreedyDefrag.solve(inputs);
    Log.hook = undefined;

    // Store pending session
    const pendingSession: DefragPendingCommit = {
      updatedDate: new Date().toISOString(),
      weekDate: date,
      selectedMeetingIds,
      defragResult: {
        startingEvents: inputs.myEventsList,
        solution: {
          timings: solution.timings,
          unplaceableEventIds: solution.unplaceableEventIds,
        },
      },
    };
    setPendingSession(pendingSession);

    events = inputs.myEventsList;
    unplaceablEventIds = solution.unplaceableEventIds;
    moveableMeetingIds = inputs.moveableEvents;
    solutionTimings = solution.timings;
    logMessages = logMessagesTemp;
  }

  const eventsDeepClone = JSON.parse(
    JSON.stringify(events.filter((event) => !unplaceablEventIds.has(event.id!)))
  ) as GoogleAppsScript.Calendar.Schema.Event[];
  eventsDeepClone.forEach((event: GoogleAppsScript.Calendar.Schema.Event) => {
    const id = event.id!;
    if (solutionTimings.has(id)) {
      const timing = solutionTimings.get(id)!;
      const startDate = new Date(event.start!.dateTime!);
      const endDate = new Date(event.end!.dateTime!);
      event.start!.dateTime = CalendarAlg.convertSecondsTimingToDate(
        timing.startTimeOfDaySeconds,
        timing.dayOfWeek,
        startDate
      ).toISOString();
      event.end!.dateTime = CalendarAlg.convertSecondsTimingToDate(
        timing.endTimeOfDaySeconds,
        timing.dayOfWeek,
        endDate
      ).toISOString();
    }
  });

  return {
    startingEvents: events,
    solutionEvents: eventsDeepClone,
    moveableMeetingIds: Array.from(moveableMeetingIds),
    unplaceableMeetingIds: Array.from(unplaceablEventIds),
    consoleLog: logMessages.join("\n"),
  };
}

// Commit the defragmented changes with a message
function commitDefrag(message: string): { success: boolean; message: string } {
  const session = getPendingSession();
  if (session === undefined) {
    return { success: false, message: "No saved defrag data found!" };
  }

  session.defragResult.startingEvents.forEach(
    (event: GoogleAppsScript.Calendar.Schema.Event) => {
      const id = event.id!;
      if (session.defragResult.solution.timings.has(id)) {
        const timing = session.defragResult.solution.timings.get(id)!;
        const startDate = new Date(event.start!.dateTime!);
        const endDate = new Date(event.end!.dateTime!);
        event.start!.dateTime = CalendarAlg.convertSecondsTimingToDate(
          timing.startTimeOfDaySeconds,
          timing.dayOfWeek,
          startDate
        ).toISOString();
        event.end!.dateTime = CalendarAlg.convertSecondsTimingToDate(
          timing.endTimeOfDaySeconds,
          timing.dayOfWeek,
          endDate
        ).toISOString();

        Log.log(`Saving event changes for ${event.summary}`);
        Log.log(`Old start time: ${startDate.toISOString()}`);
        Log.log(`New start time: ${event.start!.dateTime}`);
        // TODO cant send custom message :( but change that call to at least send updates
        Orchestrator.saveEvent(event, false, true);
      }
    }
  );
  clearPendingSession();
  return { success: true, message: "Changes committed successfully." };
}

// Install triggers for the user
function installForUser() {
  Install.setupTriggers();
  return true; // Return true if installation is successful
}

// Uninstall triggers for the user
function uninstallForUser() {
  Install.removeAllTriggers();
  return true; // Return true if uninstallation is successful
}

// Run trial automation (dry run)
function runTrialAutomation() {
  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };

  Orchestrator.runAllChecks(true /* isDryRun */);
  Log.hook = undefined;
  return logMessages.join("\n");
}

// Run real automation
function runRealAutomation() {
  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };

  Orchestrator.runAllChecks(false /* isDryRun */);
  Log.hook = undefined;
  return logMessages.join("\n");
}

// Run personal calendar automation manually
function runPersonalCalendarAutomation(): { success: boolean; logs: string[] } {
  const logMessages: string[] = [];

  // Set up log hook to capture messages
  Log.hook = (message: string) => {
    logMessages.push(message);
  };

  try {
    // Run the daily checks automation
    Orchestrator.runAllChecks(false /* isDryRun */);
    return { success: true, logs: logMessages };
  } catch (error) {
    logMessages.push(`Error: ${error.message}`);
    return { success: false, logs: logMessages };
  } finally {
    // Clear the log hook
    Log.hook = undefined;
  }
}

// Run team calendar automation manually
function runTeamCalendarAutomation(): { success: boolean; logs: string[] } {
  const logMessages: string[] = [];

  // Set up log hook to capture messages
  Log.hook = (message: string) => {
    logMessages.push(message);
  };

  try {
    // Run the team calendar features
    Orchestrator.runTeamCalendarFeatures(false /* isDryRun */);
    return { success: true, logs: logMessages };
  } catch (error) {
    logMessages.push(`Error: ${error.message}`);
    return { success: false, logs: logMessages };
  } finally {
    // Clear the log hook
    Log.hook = undefined;
  }
}
