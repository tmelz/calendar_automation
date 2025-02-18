import { CheckConflict } from "./check-conflict";
import { CheckOOO } from "./check-ooo";
import { CheckPlus5m } from "./check-plus-5m";
import { CheckQuit } from "./check-quit";
import { CheckColor } from "./check-color";
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UserSettings {
  export let settings: Settings | undefined = undefined;
  export const KEY = "userSettings_v2";

  export type Settings = {
    enabled: boolean;
    checks: {
      outOfOffice: boolean;
      plusFiveMinutes: boolean;
      quit: boolean;
      conflict: boolean;
      eventColor: boolean;
    };
    checkSettings: {
      eventColors: {
        [key in CheckColor.Category]: CheckColor.Color;
      };
    };
    teamCalendar: {
      outOfOffice: boolean;
      oncall: boolean;
    };
    teamCalendarSettings: {
      outOfOffice: { calendarId: string; groupEmail: string }[];
      oncall: {
        calendarId: string;
        scheduleId: string;
      }[];
    };
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
      case CheckColor.ColorCheck.id:
        return settings.checks.eventColor;
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
    UserSettings.settings = settings;
  }

  export function loadSettings(): UserSettings.Settings {
    if (UserSettings.settings !== undefined) {
      return UserSettings.settings;
    }

    const settingsString = PropertiesService.getUserProperties().getProperty(
      UserSettings.KEY
    );
    if (settingsString === null) {
      return createDefaultSettings();
    }
    return JSON.parse(settingsString);
  }

  export function createDefaultSettings(): UserSettings.Settings {
    return {
      enabled: false,
      checks: {
        outOfOffice: false,
        plusFiveMinutes: false,
        quit: false,
        conflict: false,
        eventColor: false,
      },
      checkSettings: {
        eventColors: CheckColor.createDefaultSettings(),
      },
      teamCalendar: {
        outOfOffice: false,
        oncall: false,
      },
      teamCalendarSettings: {
        outOfOffice: [],
        oncall: [],
      },
    };
  }
}
