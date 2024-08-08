import { Log } from "./checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Analytics {
  export let enabled: boolean = true;

  export function disable(): void {
    Analytics.enabled = false;
  }

  export function recordUserUnregister(email: string): void {
    if (!Analytics.enabled) {
      Log.log(`📊 Analytics: disabled`);
      return;
    }
    Log.log(`📊 Analytics: recording unregister event`);
    PropertiesService.getScriptProperties().deleteProperty(
      `register__${email}`
    );
    PropertiesService.getScriptProperties().setProperty(
      `unregister__${email}`,
      new Date().toISOString()
    );
  }
  export function recordUserRegister(email: string): void {
    if (!Analytics.enabled) {
      Log.log(`📊 Analytics: disabled`);
      return;
    }
    Log.log(`📊 Analytics: recording register event`);
    PropertiesService.getScriptProperties().deleteProperty(
      `unregister__${email}`
    );
    PropertiesService.getScriptProperties().setProperty(
      `register__${email}`,
      new Date().toISOString()
    );
  }

  export function recordModification(checkType: string): void {
    if (!Analytics.enabled) {
      Log.log(`📊 Analytics: disabled`);
      return;
    }
    Log.log(`📊 Analytics: bumping counter for "${checkType}" modifications`);
    const key = `modifications_${checkType}__${getFormattedDate()}`;
    Analytics.incrementCounter(key);
  }

  export function incrementCounter(key: string) {
    PropertiesService.getScriptProperties().setProperty(
      key,
      String(
        parseInt(
          PropertiesService.getScriptProperties().getProperty(key) ?? "0"
        ) + 1
      )
    );
  }

  export function getFormattedDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  }
}
