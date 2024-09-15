import { CheckTypes } from "./check-types";
import { EventUtil } from "./event-util";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckColor {
  export const ID = "Color";
  export const ConflictCheck: CheckTypes.CalendarCheck = {
    id: CheckColor.ID,
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };
  // Copy paste from Clockwise
  export enum Category {
    ExternalAttendees = "External attendees",
    OneOnOne = "One-on-one",
    FocusTime = "Focus Time",
    Hold = "Hold",
    // TODO not sure how to implement in a robust way, don't think it's important anyway
    // Holiday = "Holiday",
    TeamSync = "Team sync",
    AdHoc = "Ad-hoc",
    OutOfOffice = "Out of office",
    Other = "Other",
  }

  // Copy paste from Clockwise
  enum Color {
    NoOp = "No-op",
    Lavender = "Lavender",
    Sage = "Sage",
    Grape = "Grape",
    Flamingo = "Flamingo",
    Banana = "Banana",
    Tangerine = "Tangerine",
    Peacock = "Peacock",
    Graphite = "Graphite",
    Blueberry = "Blueberry",
    Basil = "Basil",
    Tomato = "Tomato",
  }

  // Type for the settings structure where each key must be a Category and each value must be a Color
  export type Settings = {
    [key in Category]: Color;
  };

  // Function to create default settings (all categories default to NoOp)
  export function createDefaultSettings(): Settings {
    return {
      [Category.ExternalAttendees]: Color.NoOp,
      [Category.OneOnOne]: Color.NoOp,
      [Category.FocusTime]: Color.NoOp,
      [Category.Hold]: Color.NoOp,
      //   [Category.Holiday]: Color.NoOp,
      [Category.TeamSync]: Color.NoOp,
      [Category.AdHoc]: Color.NoOp,
      [Category.OutOfOffice]: Color.NoOp,
      [Category.Other]: Color.NoOp,
    };
  }

  export const colorIdToColorMap: { [key: string]: Color } = {
    "1": Color.Lavender,
    "2": Color.Sage,
    "3": Color.Grape,
    "4": Color.Flamingo,
    "5": Color.Banana,
    "6": Color.Tangerine,
    "7": Color.Peacock,
    "8": Color.Graphite,
    "9": Color.Blueberry,
    "10": Color.Basil,
    "11": Color.Tomato,
  };

  export const colorToColorIdMap: { [key in Color]: string } = {
    [Color.Lavender]: "1",
    [Color.Sage]: "2",
    [Color.Grape]: "3",
    [Color.Flamingo]: "4",
    [Color.Banana]: "5",
    [Color.Tangerine]: "6",
    [Color.Peacock]: "7",
    [Color.Graphite]: "8",
    [Color.Blueberry]: "9",
    [Color.Basil]: "10",
    [Color.Tomato]: "11",
    [Color.NoOp]: "",
  };

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    colorSettings: Settings
  ): CheckTypes.ModificationType | undefined {
    const category = getCategoryForEvent(event);
    const color = mapColorIdToColor(event.colorId);

    const desiredColor = colorSettings[category];
    if (color !== desiredColor) {
      return CheckTypes.ModificationType.YES_CHANGE_COLOR;
    }

    return undefined;
  }

  export function modifyEventLocally(
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType,
    colorSettings: Settings
  ): CheckTypes.Changelog {
    if (modificationType !== CheckTypes.ModificationType.YES_CHANGE_COLOR) {
      return [];
    }

    const category = getCategoryForEvent(event);
    // get color id
    const colorId = mapColorToColorId(colorSettings[category]);

    const oldColorId = event.colorId;
    event.colorId = colorId;

    const logMessage = `Changed color from ${oldColorId} to ${colorId}`;
    return [logMessage];
  }

  export function mapColorIdToColor(
    colorId: string | undefined
  ): Color | undefined {
    if (colorId === undefined) {
      return undefined;
    }
    return colorIdToColorMap[colorId] || undefined;
  }

  export function mapColorToColorId(color: Color): string | undefined {
    return colorToColorIdMap[color] || undefined;
  }

  export function getCategoryForEvent(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): Category {
    // TODO consider if shared calendar and opt out

    if (EventUtil.isOneOnOneWithMe(event)) {
      return Category.OneOnOne;
    }

    if (!EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees)) {
      return Category.ExternalAttendees;
    }

    if (event.eventType === "focusTime") {
      return Category.FocusTime;
    }

    // TODO I think attendees empty
    if (event.attendees === undefined || event.attendees.length === 0) {
      return Category.Hold;
    }

    if (
      event.attendees?.length > 2 ||
      EventUtil.isAnAttendeeLikelyAnEmailList(event)
    ) {
      return Category.TeamSync;
    }

    if (event.recurringEventId === undefined) {
      return Category.AdHoc;
    }

    if (event.eventType === "outOfOffice") {
      return Category.OutOfOffice;
    }

    return Category.Other;
  }
}
