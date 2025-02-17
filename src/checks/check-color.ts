import { CheckTypes } from "./check-types";
import { EventUtil } from "./event-util";
import { Log } from "./log";
import { UserSettings } from "./user-settings";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckColor {
  export const ID = "Color";

  export const ColorCheck: CheckTypes.CalendarCheck = {
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
  // apps script types have something similar but doesn't seem particularly useful
  // e.g. CalendarApp.EventColor.BLUE;
  export enum Color {
    NoOp = "No-op",
    Delete = "Delete",
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
    [Color.Delete]: "",
  };

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    colorSettings: Settings = UserSettings.loadSettings().checkSettings
      .eventColors
  ): CheckTypes.ModificationType | undefined {
    if (event.eventType === "workingLocation") {
      return undefined;
    }

    const category = getCategoryForEvent(event);
    if (category === undefined) {
      Log.log(`👎 not modifying event color, no category found`);
      return undefined;
    }
    const color = mapColorIdToColor(event.colorId);

    const desiredColor = colorSettings[category];

    Log.log(
      `Category: ${category}, current color: ${color}, desiredColor: ${desiredColor}`
    );

    if (desiredColor === CheckColor.Color.NoOp) {
      return undefined;
    }

    if (desiredColor === CheckColor.Color.Delete) {
      return color !== undefined
        ? CheckTypes.ModificationType.YES_CHANGE_COLOR
        : undefined;
    }

    if (color !== desiredColor) {
      return CheckTypes.ModificationType.YES_CHANGE_COLOR;
    }

    return undefined;
  }

  export function modifyEventLocally(
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType,
    colorSettings: Settings = UserSettings.loadSettings().checkSettings
      .eventColors
  ): CheckTypes.Changelog {
    if (modificationType !== CheckTypes.ModificationType.YES_CHANGE_COLOR) {
      return [];
    }

    const category = getCategoryForEvent(event);
    if (category === undefined) {
      Log.log(`🚨 error, no category found for event, bailing`);
      return [];
    }
    const oldColorId = event.colorId;

    const desiredColor = colorSettings[category];
    if (desiredColor === CheckColor.Color.NoOp) {
      // do nothing, invariant violation, but dont throw error because setting could've changed async
    } else if (desiredColor === CheckColor.Color.Delete) {
      event.colorId = undefined;
    } else {
      const colorId = mapColorToColorId(desiredColor);
      event.colorId = colorId;
    }

    const logMessage = `Changed color from ${oldColorId} (${mapColorIdToColor(oldColorId)}) to ${event.colorId} (${mapColorIdToColor(event.colorId)})`;
    return [logMessage];
  }

  export function mapColorIdToColor(
    colorId: string | undefined
  ): Color | undefined {
    if (colorId === undefined) {
      return undefined;
    }
    return CheckColor.colorIdToColorMap[colorId] || undefined;
  }

  export function mapColorToColorId(color: Color): string | undefined {
    return CheckColor.colorToColorIdMap[color] || undefined;
  }

  export function getCategoryForEvent(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): Category | undefined {
    if (event.guestsCanSeeOtherGuests === false) {
      return Category.Other;
    }

    // Ordering of these if checks is very deliberate
    if (event.eventType === "focusTime") {
      return Category.FocusTime;
    }

    if (event.eventType === "outOfOffice") {
      return Category.OutOfOffice;
    }

    if (event.attendees === undefined || event.attendees.length === 0) {
      return Category.Hold;
    }

    if (!EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees)) {
      return Category.ExternalAttendees;
    }

    if (event.recurringEventId === undefined) {
      return Category.AdHoc;
    }

    if (EventUtil.isOneOnOneWithMe(event)) {
      return Category.OneOnOne;
    }

    if (
      event.attendees?.length > 2 ||
      EventUtil.isAnAttendeeLikelyAnEmailList(event)
    ) {
      return Category.TeamSync;
    }

    return Category.Other;
  }
}
