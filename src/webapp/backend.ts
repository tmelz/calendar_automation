import { Orchestrator } from "../orchestrator";
import { Install } from "../install";
import { Log } from "../checks/log";
import { CalendarAlg } from "../defrag/calendar-alg";
import { GreedyDefrag } from "../defrag/greedy-defrag";
import { UserSettings } from "../checks/user-settings";
import { GetEvents } from "../checks/get-events";
import { EventUtil } from "../checks/event-util";

// Interfaces for Defrag Results and Pending Session
interface DefragResult {
  startingEvents: GoogleAppsScript.Calendar.Schema.Event[];
  solutionEvents: GoogleAppsScript.Calendar.Schema.Event[];
  moveableMeetingIds: string[];
  unplaceableMeetingIds: string[];
  consoleLog: string;
}

interface PendingSession {
  date: string;
  selectedMeetingIds: string[];
  defragResult: DefragResult;
}

// Helper functions to manage cache
function getCache(): GoogleAppsScript.Cache.Cache {
  return CacheService.getUserCache();
}

function setPendingSession(session: PendingSession): void {
  const cache = getCache();
  cache.put("pendingSession", JSON.stringify(session), 1500); // Cache for 25 minutes
}

function getPendingSession(): PendingSession | null {
  const cache = getCache();
  const session = cache.get("pendingSession");
  return session ? JSON.parse(session) : null;
}

function clearPendingSession(): void {
  const cache = getCache();
  cache.remove("pendingSession");
}

// Handle GET requests
function doGet(e: GoogleAppsScript.Events.DoGet) {
  const page = e.parameter.page;
  let templateFile = "src/webapp/Index";

  if (page === "defrag") {
    templateFile = "src/webapp/defrag";
  }

  const template = HtmlService.createTemplateFromFile(templateFile);
  const userSettings = UserSettings.loadSettings();
  template.userSettings = JSON.stringify(userSettings);
  return template
    .evaluate()
    .setTitle("Calendar Automation")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    .filter((event) => EventUtil.isOneOnOneWithMe(event))
    .filter(
      (event) =>
        !event.attendees?.some(
          (attendee) => attendee.email === "azra@block.xyz"
        )
    )
    .map((event) => event.id!);

  return { events, moveableMeetingIds };
}

// Defragment the calendar based on selected meetings
function defrag(date: string, selectedMeetingIds: string[]): DefragResult {
  const inputs = CalendarAlg.getInputs(new Date(date));

  // make inputs.moveableEvents the intersection of existing moveable events and selected meetings
  inputs.moveableEvents = new Set(
    selectedMeetingIds.filter((id) => inputs.moveableEvents.has(id))
  );

  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };
  const solution = GreedyDefrag.solve(inputs);
  Log.hook = undefined;

  const eventsDeepClone = JSON.parse(
    JSON.stringify(
      inputs.myEventsList.filter(
        (event) => !solution.unplaceableEventIds.has(event.id!)
      )
    )
  ) as GoogleAppsScript.Calendar.Schema.Event[];

  eventsDeepClone.forEach((event: GoogleAppsScript.Calendar.Schema.Event) => {
    const id = event.id!;
    if (solution.timings.has(id)) {
      const timing = solution.timings.get(id)!;
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

  const defragResult: DefragResult = {
    startingEvents: inputs.myEventsList,
    solutionEvents: eventsDeepClone,
    moveableMeetingIds: Array.from(inputs.moveableEvents),
    unplaceableMeetingIds: Array.from(solution.unplaceableEventIds),
    consoleLog: logMessages.join("\n"),
  };

  // Store pending session
  const pendingSession: PendingSession = {
    date,
    selectedMeetingIds,
    defragResult,
  };
  // setPendingSession(pendingSession);

  return defragResult;
}

// Commit the defragmented changes with a message
function commitDefrag(
  message: string,
  defragResult: DefragResult
): { success: boolean; message: string } {
  if (!defragResult) {
    return { success: false, message: "No defragmentation data found." };
  }

  // TODO get pending defrag result from cache
  // foreach event thats different call saveEvent. thats it

  // TODO
  // const calendar = CalendarApp.getDefaultCalendar();
  // const logMessages: string[] = [];

  // defragResult.solutionEvents.forEach((event) => {
  //   const originalEvent = defragResult.startingEvents.find(
  //     (e) => e.id === event.id
  //   );
  //   if (originalEvent) {
  //     const calendarEvent = calendar.getEventById(originalEvent.id!);
  //     if (calendarEvent) {
  //       calendarEvent.setTime(
  //         new Date(event.start!.dateTime!),
  //         new Date(event.end!.dateTime!)
  //       );
  //       calendarEvent.setDescription(message);
  //       logMessages.push(`Updated event: ${event.summary}`);
  //     }
  //   }
  // });

  // defragResult.unplaceableMeetingIds.forEach((id) => {
  //   const event = defragResult.startingEvents.find((e) => e.id === id);
  //   if (event) {
  //     const calendarEvent = calendar.getEventById(event.id!);
  //     if (calendarEvent) {
  //       calendarEvent.setColor(CalendarApp.EventColor.GRAY);
  //       logMessages.push(`Marked event as unplaceable: ${event.summary}`);
  //     }
  //   }
  // });

  // // Log the commit message
  // Log.log(`Commit Message: ${message}`);
  // Log.log(logMessages.join("\n"));

  // Clear pending session after commit
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
