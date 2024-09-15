// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckTypes {
  export enum ModificationType {
    YES_ADD_LABEL,
    YES_REMOVE_LABEL,
    YES_CHANGE_COLOR,
  }

  export type Changelog = string[];

  export type ShouldModifyEvent = (
    event: GoogleAppsScript.Calendar.Schema.Event
  ) => CheckTypes.ModificationType | undefined;
  export type ModifyEventLocally = (
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType
  ) => Changelog;

  export interface CalendarCheck {
    id: string;
    shouldModifyEvent: CheckTypes.ShouldModifyEvent;
    modifyEventLocally: CheckTypes.ModifyEventLocally;
  }
}
