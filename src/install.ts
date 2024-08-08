import { Orchestrator } from "./orchestrator";

// README
// To install, select setupTriggers function in IDE and click run

// All these top level functions are runnable from the apps script IDE;
// namespaced functions are not selectable from the IDE
export function runCalendarChangedChecks(): void {
  Orchestrator.runFastChecks(false /* isDryRun */);
}

export function runDailyChecks(): void {
  Orchestrator.runAllChecks(false /* isDryRun */);
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Install {
  export function removeAllTriggers(): void {
    // Remove all existing triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  export function setupTriggers(): void {
    removeAllTriggers();

    // Create a daily trigger at 8 AM Pacific Time
    ScriptApp.newTrigger("runDailyChecks")
      .timeBased()
      .atHour(8)
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
