import { Orchestrator } from "../orchestrator";
import { Install } from "../install";
import { Log } from "../checks/log";
import { CalendarAlg } from "../defrag/calendar-alg";
import { GreedyDefrag } from "../defrag/greedy-defrag";
import { UserSettings } from "../checks/user-settings";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// function isUserInstalled(): { installed: boolean; email: string } {
//   const triggers = ScriptApp.getProjectTriggers();
//   const installed = triggers.length > 0;
//   const userEmail = Session.getActiveUser().getEmail();
//   return { installed, email: userEmail };
// }

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

function defrag() {
  const inputs = CalendarAlg.getInputs(new Date("2024-10-06"));

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
  );
  eventsDeepClone.forEach((event: GoogleAppsScript.Calendar.Schema.Event) => {
    const id = event.id!;
    if (solution.timings.has(id)) {
      const timing = solution.timings.get(id)!;
      const startDate = new Date(event.start!.dateTime!);
      const endDate = new Date(event.end!.dateTime!);
      CalendarAlg.convertSecondsTimingToDate;
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
    startingEvents: inputs.myEventsList,
    solutionEvents: eventsDeepClone,
    moveableMeetingIds: Array.from(inputs.moveableEvents),
    unplaceableMeetingIds: Array.from(solution.unplaceableEventIds),
    consoleLog: logMessages.join("\n"),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function installForUser() {
  Install.setupTriggers();
  return true; // Return true if installation is successful
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uninstallForUser() {
  Install.removeAllTriggers();
  return true; // Return true if uninstallation is successful
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function runTrialAutomation() {
  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };

  Orchestrator.runAllChecks(true /* isDryRun */);
  Log.hook = undefined;
  return logMessages.join("\n");
}

function runRealAutomation() {
  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };

  Orchestrator.runAllChecks(false /* isDryRun */);
  Log.hook = undefined;
  return logMessages.join("\n");
}
