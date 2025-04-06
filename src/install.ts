import { Orchestrator } from "./orchestrator";
import { Analytics } from "./analytics";
import { UserSettings } from "./checks/user-settings";
import { Log } from "./checks/log";
import { Pagerduty } from "./pagerduty";

// README
// To install, select setupTriggers function in IDE and click run

export function logUser(): void {
  Log.log(`Running for user ${Session.getActiveUser().getEmail()}`);
}

// All these top level functions are runnable from the apps script IDE;
// namespaced functions are not selectable from the IDE
export function runCalendarChangedChecks(): void {
  logUser();
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  Orchestrator.runFastChecks(false /* isDryRun */);
}

export function runDailyChecks(): void {
  logUser();
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  globalTriggerHook();
  Orchestrator.runAllChecks(false /* isDryRun */);
}

export function runTeamCalendarFeatures(): void {
  logUser();
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  Orchestrator.runTeamCalendarFeatures(false /* isDryRun */);
}

export function runTeamCalendarFeaturesDryRun(): void {
  logUser();
  if (!checkIfEnabled()) {
    Log.log("Triggered, but disabled. Exiting.");
    return;
  }
  Orchestrator.runTeamCalendarFeatures(true /* isDryRun */);
}

export function runCalendarChangedChecksDryRun(): void {
  logUser();
  Orchestrator.runFastChecks(true /* isDryRun */);
}

export function runDailyChecksDryRun(): void {
  logUser();
  Orchestrator.runAllChecks(true /* isDryRun */);
}

export function removeAllTriggers(): void {
  Install.removeAllTriggers();
}

export function setupTriggers(): void {
  Install.setupTriggers(true /* bypassAnalytics */);
}

export function checkIfEnabled(): boolean {
  return UserSettings.loadSettings().enabled;
}

// To ensure all users have the same hooks setup, auto remove all hooks
// then install latest ones on a regular basis. About 10s overhead to
// run this method unfortunately, so don't at this to all triggers.
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

    // Create triggers to run at 8 AM and 3 PM Pacific Time
    ScriptApp.newTrigger("runDailyChecks")
      .timeBased()
      .atHour(8)
      .nearMinute(0)
      .inTimezone("America/Los_Angeles")
      .everyDays(1)
      .create();

    ScriptApp.newTrigger("runDailyChecks")
      .timeBased()
      .atHour(15) // 3 PM
      .nearMinute(0)
      .inTimezone("America/Los_Angeles")
      .everyDays(1)
      .create();

    // Create triggers to run at 8 AM and 3 PM Pacific Time
    ScriptApp.newTrigger("runTeamCalendarFeatures")
      .timeBased()
      .atHour(8)
      .nearMinute(30) // Offset by 30 minutes
      .inTimezone("America/Los_Angeles")
      .everyDays(1)
      .create();

    ScriptApp.newTrigger("runTeamCalendarFeatures")
      .timeBased()
      .atHour(15) // 3 PM
      .nearMinute(30) // Offset by 30 minutes
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

export function setupSecrets() {
  // don't commit these values to source control, use the apps script UI
  // to fill them out and run the method; as a hacky secrets manager
  PropertiesService.getScriptProperties().setProperty(
    Pagerduty.TOKEN_KEY,
    "TODO"
  );
}
