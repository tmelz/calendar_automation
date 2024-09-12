import { Orchestrator } from "../orchestrator";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UserSettings {
  export const KEY = "userSettings";

  export type Settings = {
    checks: { [key: string]: boolean };
    // TODO
    // check settings? like colors
  };

  export function isCheckEnabled(
    settings: UserSettings.Settings,
    checkId: string
  ): boolean {
    return settings.checks[checkId] ?? false;
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
      checks: checksSettings,
    };
  }
}
