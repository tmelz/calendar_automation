import { Orchestrator } from "../orchestrator";
import { CheckConflict } from "./check-conflict";
import { CheckOOO } from "./check-ooo";
import { CheckPlus5m } from "./check-plus-5m";
import { CheckQuit } from "./check-quit";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UserSettings {
  export const KEY = "userSettings";

  export type Settings = {
    enabled: boolean;
    checks: {
      outOfOffice: boolean;
      plusFiveMinutes: boolean;
      quit: boolean;
      conflict: boolean;
    };
    // checkSettings: {};
  };

  export function isCheckEnabled(
    settings: UserSettings.Settings,
    checkId: string
  ): boolean {
    if (!settings.enabled) {
      return false;
    }

    switch (checkId) {
      case CheckOOO.OutOfOfficeCheck.id:
        return settings.checks.outOfOffice;
      case CheckPlus5m.PlusFiveMinutesCheck.id:
        return settings.checks.plusFiveMinutes;
      case CheckQuit.QuitCheck.id:
        return settings.checks.quit;
      case CheckConflict.ConflictCheck.id:
        return settings.checks.conflict;
      default:
        throw new Error(`Unknown check id: ${checkId}`);
        return false;
    }
  }

  export function saveSettings(settings: UserSettings.Settings): void {
    PropertiesService.getUserProperties().setProperty(
      UserSettings.KEY,
      JSON.stringify(settings)
    );
  }

  export function loadSettings(): UserSettings.Settings {
    const settingsString = PropertiesService.getUserProperties().getProperty(
      UserSettings.KEY
    );
    if (settingsString === null) {
      return createDefaultSettings();
    }
    return JSON.parse(settingsString);
  }

  export function createDefaultSettings(): UserSettings.Settings {
    const checksSettings: { [key: string]: boolean } = {};
    Orchestrator.allChecks.forEach((check) => {
      checksSettings[check.id] = false;
    });

    return {
      enabled: false,
      checks: {
        outOfOffice: false,
        plusFiveMinutes: false,
        quit: false,
        conflict: false,
      },
    };
  }
}
