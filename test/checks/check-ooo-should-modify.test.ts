import { jest } from "@jest/globals";
import {
  myOneOnOneEventWithOOOConflict,
  theirIrrelevantEvent,
} from "./event-data";
import { CheckOOO } from "../../src/checks/check-ooo";
import { CheckTypes } from "../../src/checks/check-types";

describe("checkShouldModifyEvent", () => {
  it("should return undefined if theirEmail is null", () => {
    const event = {
      summary: "Test Event",
      start: { dateTime: "2024-07-25T10:00:00Z" },
      end: { dateTime: "2024-07-25T11:00:00Z" },
    } as GoogleAppsScript.Calendar.Schema.Event;

    const result = CheckOOO.checkShouldModifyEvent(
      event,
      (_, __, ___) => {
        return [event];
      },
      (_, __) => {
        return false;
      }
    );
    expect(result).toBe(undefined);
  });

  it("should return YES if checkIfEventIsOOOAndOverlaps returns true for any event", () => {
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([theirIrrelevantEvent]);
    const result = CheckOOO.checkShouldModifyEvent(
      myOneOnOneEventWithOOOConflict,
      getEventMock as (
        timeMin: Date,
        timeMax: Date,
        calendarId: string
      ) => GoogleAppsScript.Calendar.Schema.Event[],
      (_, __) => {
        return true;
      }
    );

    expect(result).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
    expect(getEventMock).toHaveBeenCalledWith(
      new Date("2024-07-29T21:35:00.000Z"),
      new Date("2024-07-31T22:00:00.000Z"),
      "them@example.com",
      undefined,
      undefined,
      undefined
    );
  });

  it("should return false if get undefined for events", () => {
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue(undefined);
    const result = CheckOOO.checkShouldModifyEvent(
      myOneOnOneEventWithOOOConflict,
      getEventMock as (
        timeMin: Date,
        timeMax: Date,
        calendarId: string
      ) => GoogleAppsScript.Calendar.Schema.Event[] | undefined,
      (_, __) => {
        return true;
      }
    );

    expect(result).toBe(undefined);
  });

  it("should return undefined if no overlapping OOO events are found", () => {
    const result = CheckOOO.checkShouldModifyEvent(
      myOneOnOneEventWithOOOConflict,
      (_, __, ___) => {
        return [theirIrrelevantEvent];
      },
      (_, __) => {
        return false;
      }
    );
    expect(result).toBe(undefined);
  });

  it("should return YES_REMOVE_LABEL if no overlapping OOO events are found but have OOO title", () => {
    const event = {
      ...myOneOnOneEventWithOOOConflict,
      summary: CheckOOO.OOO_TITLE_PREFIX_NOTICE + "foobar",
    };
    const result = CheckOOO.checkShouldModifyEvent(
      event,
      (_, __, ___) => {
        return [theirIrrelevantEvent];
      },
      (_, __) => {
        return false;
      }
    );
    expect(result).toBe(CheckTypes.ModificationType.YES_REMOVE_LABEL);
  });
});
