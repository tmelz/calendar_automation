import { jest } from "@jest/globals";
import { CheckColor } from "../../src/checks/check-color";
import {
  myOneOnOneEvent,
  focusTimeEvent,
  holdEvent,
  teamEvent,
  adhocEvent,
  theirOOOSpecificTimeEvent,
  interviewEvent,
  interviewEvent2,
  groupEventWithNoVizOnOtherGuests,
  recurringLargeCalendarEVent,
} from "./event-data";
import { CheckTypes } from "../../src/checks/check-types";

describe("getCategoryForEvent", () => {
  it("should return Category.OneOnOne for a one-on-one event", () => {
    const result = CheckColor.getCategoryForEvent(myOneOnOneEvent);
    expect(result).toBe(CheckColor.Category.OneOnOne);
  });

  it("should return Category.ExternalAttendees for an event with external attendees", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          responseStatus: "accepted",
          self: true,
          organizer: true,
          email: "foo@block.xyz",
        },
        { email: "bar@example.com", responseStatus: "needsAction" },
      ],
    };
    const result = CheckColor.getCategoryForEvent(event);
    expect(result).toBe(CheckColor.Category.ExternalAttendees);
  });

  it("should return external attendees for interview event", () => {
    const result = CheckColor.getCategoryForEvent(interviewEvent);
    expect(result).toBe(CheckColor.Category.ExternalAttendees);
  });

  it("should return external attendees for interview event", () => {
    const result = CheckColor.getCategoryForEvent(interviewEvent2);
    expect(result).toBe(CheckColor.Category.ExternalAttendees);
  });

  it("should return Category.FocusTime for a focus time event", () => {
    const result = CheckColor.getCategoryForEvent(focusTimeEvent);
    expect(result).toBe(CheckColor.Category.FocusTime);
  });

  it("should return Category.Hold for an event with no attendees", () => {
    const result = CheckColor.getCategoryForEvent(holdEvent);
    expect(result).toBe(CheckColor.Category.Hold);
  });

  it("should return Category.TeamSync for a team sync event", () => {
    const result = CheckColor.getCategoryForEvent(teamEvent);
    expect(result).toBe(CheckColor.Category.TeamSync);
  });

  it("should return Category.AdHoc for an ad-hoc event", () => {
    const result = CheckColor.getCategoryForEvent(adhocEvent);
    expect(result).toBe(CheckColor.Category.AdHoc);
  });

  it("should return Category.OutOfOffice for an out-of-office event", () => {
    const result = CheckColor.getCategoryForEvent(theirOOOSpecificTimeEvent);
    expect(result).toBe(CheckColor.Category.OutOfOffice);
  });

  it("should return Category.Other for any other type of event", () => {
    const result = CheckColor.getCategoryForEvent(
      groupEventWithNoVizOnOtherGuests
    );
    expect(result).toBe(CheckColor.Category.Other);
  });

  it("should return Category.Other for any other type of event", () => {
    const result = CheckColor.getCategoryForEvent(recurringLargeCalendarEVent);
    expect(result).toBe(CheckColor.Category.Other);
  });
});

describe("modifyEventLocally", () => {
  it("correctly adds the right color id", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: undefined,
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.Lavender,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBe(
      CheckColor.mapColorToColorId(CheckColor.Color.Lavender)
    );
  });

  it("changes color id", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.Lavender,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBe(
      CheckColor.mapColorToColorId(CheckColor.Color.Lavender)
    );
  });

  it("no-op color id if NoOp set", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.NoOp,
      } as CheckColor.Settings
    );
    expect(event.colorId).toEqual("3");
  });

  it("removes color id if Delete set", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.Delete,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBeUndefined();
  });
});

describe("checkShouldModifyEvent", () => {
  // Helper to create a settings object based on the default, with OneOnOne overridden as needed.
  const createSettingsForOneOnOne = (
    color: CheckColor.Color
  ): CheckColor.Settings => {
    const settings = CheckColor.createDefaultSettings();
    settings[CheckColor.Category.OneOnOne] = color;
    return settings;
  };

  it("should return undefined for events with eventType 'workingLocation'", () => {
    const event = {
      ...myOneOnOneEvent,
      eventType: "workingLocation",
    } as GoogleAppsScript.Calendar.Schema.Event;
    const settings = createSettingsForOneOnOne(CheckColor.Color.Lavender);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBeUndefined();
  });

  it("should return undefined if desired color is NoOp", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    } as GoogleAppsScript.Calendar.Schema.Event; // current color is Grape, but irrelevant here
    const settings = createSettingsForOneOnOne(CheckColor.Color.NoOp);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBeUndefined();
  });

  it("should return YES_CHANGE_COLOR for desired Delete when event color is present", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    } as GoogleAppsScript.Calendar.Schema.Event; // colorId "3" maps to Grape
    const settings = createSettingsForOneOnOne(CheckColor.Color.Delete);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBe(CheckTypes.ModificationType.YES_CHANGE_COLOR);
  });

  it("should return undefined for desired Delete when event color is undefined", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: undefined,
    } as GoogleAppsScript.Calendar.Schema.Event;
    const settings = createSettingsForOneOnOne(CheckColor.Color.Delete);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBeUndefined();
  });

  it("should return YES_CHANGE_COLOR when desired specific color is set and current color is different", () => {
    // current color "3" (Grape), desired is Lavender.
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    } as GoogleAppsScript.Calendar.Schema.Event;
    const settings = createSettingsForOneOnOne(CheckColor.Color.Lavender);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBe(CheckTypes.ModificationType.YES_CHANGE_COLOR);
  });

  it("should return YES_CHANGE_COLOR when desired specific color is set and event has no color", () => {
    // current color is undefined, desired is Lavender.
    const event = {
      ...myOneOnOneEvent,
      colorId: undefined,
    } as GoogleAppsScript.Calendar.Schema.Event;
    const settings = createSettingsForOneOnOne(CheckColor.Color.Lavender);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBe(CheckTypes.ModificationType.YES_CHANGE_COLOR);
  });

  it("should return undefined when desired specific color is set and current color matches desired", () => {
    // Set event's colorId to the desired value for Lavender.
    const desiredColorId = CheckColor.mapColorToColorId(
      CheckColor.Color.Lavender
    );
    const event = {
      ...myOneOnOneEvent,
      colorId: desiredColorId,
    } as GoogleAppsScript.Calendar.Schema.Event;
    const settings = createSettingsForOneOnOne(CheckColor.Color.Lavender);
    const result = CheckColor.checkShouldModifyEvent(event, settings);
    expect(result).toBeUndefined();
  });
});
