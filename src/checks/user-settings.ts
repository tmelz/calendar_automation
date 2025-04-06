import { CheckConflict } from "./check-conflict";
import { CheckOOO } from "./check-ooo";
import { CheckPlus5m } from "./check-plus-5m";
import { CheckColor } from "./check-color";
import { CheckNotes } from "./check-notes";
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UserSettings {
  export let settings: Settings | undefined = undefined;
  export const KEY = "userSettings_v2";

  export type Settings = {
    enabled: boolean;
    checks: {
      outOfOffice: boolean;
      plusFiveMinutes: boolean;
      conflict: boolean;
      eventColor: boolean;
      notes: boolean;
    };
    checkSettings: {
      eventColors: {
        [key in CheckColor.Category]: CheckColor.Color;
      };
      plusFiveMinutes: {
        oneOnOnes: boolean;
        anyEventIOrganizeOrCreateWithAttendees: boolean;
      };
    };
    teamCalendar: {
      outOfOffice: boolean;
      oncall: boolean;
      inviteOncallEmail: boolean;
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
      case CheckConflict.ConflictCheck.id:
        return settings.checks.conflict;
      case CheckColor.ColorCheck.id:
        return settings.checks.eventColor;
      case CheckNotes.NotesCheck.id:
        return settings.checks.notes;
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
        conflict: false,
        eventColor: false,
        notes: false,
      },
      checkSettings: {
        eventColors: CheckColor.createDefaultSettings(),
        plusFiveMinutes: {
          oneOnOnes: false,
          anyEventIOrganizeOrCreateWithAttendees: false,
          // anyEventWithFiveOrFewerPeopleAndNoEmailListAttendees: false,
        },
      },
      teamCalendar: {
        outOfOffice: false,
        oncall: false,
        inviteOncallEmail: false,
      },
      teamCalendarSettings: {
        outOfOffice: [],
        oncall: [],
      },
    };
  }
}
