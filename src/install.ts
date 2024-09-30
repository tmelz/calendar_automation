import { Orchestrator } from "./orchestrator";
import { Analytics } from "./analytics";
import { UserSettings } from "./checks/user-settings";
import { Log } from "./checks/log";

// README
// To install, select setupTriggers function in IDE and click run

// All these top level functions are runnable from the apps script IDE;
// namespaced functions are not selectable from the IDE
export function runCalendarChangedChecks(): void {
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  Orchestrator.runFastChecks(false /* isDryRun */);
}

export function runDailyChecks(): void {
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  globalTriggerHook();
  Orchestrator.runAllChecks(false /* isDryRun */);
}

export function runTeamCalendarFeatures(): void {
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  globalTriggerHook();
  Orchestrator.runTeamCalendarFeatures();
}

export function runCalendarChangedChecksDryRun(): void {
  Orchestrator.runFastChecks(true /* isDryRun */);
}

export function runDailyChecksDryRun(): void {
  Orchestrator.runAllChecks(true /* isDryRun */);
}

export function removeAllTriggers(): void {
  Install.removeAllTriggers();
}

export function setupTriggers(): void {
  Install.setupTriggers();
}

export function checkIfEnabled(): boolean {
  return UserSettings.loadSettings().enabled;
}

export function globalTriggerHook(): void {
  Log.log("Global trigger hook; ensuring triggers are setup to latest spec");
  setupTriggers();
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Install {
  export function removeAllTriggers(bypassAnalytics: boolean = false): void {
    if (!bypassAnalytics) {
      Analytics.recordUserUnregister(Session.getActiveUser().getEmail());
    }

    // Remove all existing triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  export function setupTriggers(bypassAnalytics: boolean = false): void {
    if (!bypassAnalytics) {
      Analytics.recordUserRegister(Session.getActiveUser().getEmail());
    }
    removeAllTriggers(true);

    // Create a daily trigger at 8 AM Pacific Time
    ScriptApp.newTrigger("runDailyChecks")
      .timeBased()
      .atHour(8)
      .nearMinute(0)
      .inTimezone("America/Los_Angeles")
      .everyDays(1)
      .create();

    // Create a daily trigger at 8 AM Pacific Time
    ScriptApp.newTrigger("runTeamCalendarFeatures")
      .timeBased()
      .atHour(9)
      .nearMinute(0)
      .inTimezone("America/Los_Angeles")
      .everyDays(1)
      .create();

    // Create a calendar change trigger
    ScriptApp.newTrigger("runCalendarChangedChecks")
      .forUserCalendar(Session.getActiveUser().getEmail())
      .onEventUpdated()
      .create();
  }
}

export function getAnalytics(): { [key: string]: string } {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();

  Logger.log(allProperties); // View in Apps Script Logs
  return allProperties; // Or return as JSON for an API endpoint
}
