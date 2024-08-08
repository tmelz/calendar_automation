import { jest } from "@jest/globals";
import {
  myOneOnOneWithPotentialConflict,
  theirTimeConflictEvent,
  theirRandomEvent1,
  theirRandomEvent2,
  theirVersionOfOurOneOnOneEvent,
} from "./event-data";
import { CheckConflict } from "../../src/checks/check-conflict";
import { CheckTypes } from "../../src/checks/check-types";
import { GetEvents } from "../../src/checks/get-events";

describe("checkShouldModifyEvent", () => {
  it("should return undefined if theirEmail is null", () => {
    const event = {
      summary: "Test Event",
      start: { dateTime: "2024-07-25T10:00:00Z" },
      end: { dateTime: "2024-07-25T11:00:00Z" },
    } as GoogleAppsScript.Calendar.Schema.Event;

    const result = CheckConflict.checkShouldModifyEvent(event, (_, __, ___) => {
      return [event];
    });
    expect(result).toBe(undefined);
  });

  it("should return YES_ADD_LABEL if overlapping event", () => {
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([theirTimeConflictEvent]);
    const result = CheckConflict.checkShouldModifyEvent(
      myOneOnOneWithPotentialConflict,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
    expect(getEventMock).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "them@example.com"
    );
  });

  it("should return undefined if overlapping event but already has notice", () => {
    const eventWithTitleAndDescriptionAlready: GoogleAppsScript.Calendar.Schema.Event =
      {
        ...myOneOnOneWithPotentialConflict,
        summary: CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE + "foobar",
        description: CheckConflict.CONFLICT_DESCRIPTION_BLURB,
      };
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([theirTimeConflictEvent]);
    const result = CheckConflict.checkShouldModifyEvent(
      eventWithTitleAndDescriptionAlready,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(undefined);
  });

  it("should return YES_ADD_LABEL if overlapping event with description notice but not title notice", () => {
    const eventWithTitleAndDescriptionAlready: GoogleAppsScript.Calendar.Schema.Event =
      {
        ...myOneOnOneWithPotentialConflict,
        summary: "foobar",
        description: CheckConflict.CONFLICT_DESCRIPTION_BLURB,
      };
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([theirTimeConflictEvent]);
    const result = CheckConflict.checkShouldModifyEvent(
      eventWithTitleAndDescriptionAlready,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
  });

  it("should return YES_ADD_LABEL if overlapping event with title notice but not description notice", () => {
    const eventWithTitleAndDescriptionAlready: GoogleAppsScript.Calendar.Schema.Event =
      {
        ...myOneOnOneWithPotentialConflict,
        summary: CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE + "foobar",
        description: undefined,
      };
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([theirTimeConflictEvent]);
    const result = CheckConflict.checkShouldModifyEvent(
      eventWithTitleAndDescriptionAlready,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
  });

  it("should return YES_ADD_LABEL if overlapping event and many others", () => {
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue([
      theirTimeConflictEvent,
      theirRandomEvent1,
      theirRandomEvent2,
    ]);
    const result = CheckConflict.checkShouldModifyEvent(
      myOneOnOneWithPotentialConflict,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
    expect(getEventMock).toHaveBeenCalledWith(
      // event start/end +/- 3 hours
      new Date("2024-08-02T08:35:00-07:00"),
      new Date("2024-08-02T15:00:00-07:00"),
      "them@example.com"
    );
  });

  it("should return undefined if getEvents returns undefined", () => {
    const getEventMock = jest.fn();
    getEventMock.mockReturnValue(undefined);
    const result = CheckConflict.checkShouldModifyEvent(
      myOneOnOneWithPotentialConflict,
      getEventMock as GetEvents.EventFetcherWithError
    );

    expect(result).toBe(undefined);
  });

  it("should return undefined if overlapping event but has some ID as our 1:1", () => {
    const result = CheckConflict.checkShouldModifyEvent(
      myOneOnOneWithPotentialConflict,
      (_, __, ___) => {
        return [theirVersionOfOurOneOnOneEvent];
      }
    );
    expect(result).toBe(undefined);
  });

  it("should return YES_REMOVE_LABEL if no overlapping conflict events are found but have conflict title", () => {
    const event = {
      ...myOneOnOneWithPotentialConflict,
      summary: CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE + "foobar",
    };
    const result = CheckConflict.checkShouldModifyEvent(event, (_, __, ___) => {
      return [theirRandomEvent1];
    });
    expect(result).toBe(CheckTypes.ModificationType.YES_REMOVE_LABEL);
  });

  it("should return false if the attendee did not RSVP 'Yes'", () => {
    const myEvent = {
      start: { dateTime: "2024-07-25T10:00:00Z" },
      end: { dateTime: "2024-07-25T11:00:00Z" },
      attendees: [{ email: "them@example.com" }],
    } as GoogleAppsScript.Calendar.Schema.Event;

    const theirEvent = {
      start: { dateTime: "2024-07-25T10:00:00Z" },
      end: { dateTime: "2024-07-25T11:00:00Z" },
      attendees: [{ email: "them@example.com", responseStatus: "declined" }],
    } as GoogleAppsScript.Calendar.Schema.Event;

    const result = CheckConflict.checkIfEventIsRSVPYesAndOverlaps(
      myEvent,
      theirEvent
    );
    expect(result).toBe(false);
  });

  it("should return false if event times are not properly defined", () => {
    const myEvent = {
      start: { dateTime: "2024-07-25T10:00:00Z" },
      end: { dateTime: "2024-07-25T11:00:00Z" },
      attendees: [{ email: "them@example.com" }],
    } as GoogleAppsScript.Calendar.Schema.Event;

    const theirEvent = {
      start: { dateTime: undefined },
      end: { dateTime: undefined },
      attendees: [{ email: "them@example.com", responseStatus: "accepted" }],
    } as GoogleAppsScript.Calendar.Schema.Event;

    const result = CheckConflict.checkIfEventIsRSVPYesAndOverlaps(
      myEvent,
      theirEvent
    );
    expect(result).toBe(false);
  });

  describe("modifyEventLocally", () => {
    it("should add conflict prefix to the event summary if modification type is YES_ADD_LABEL", () => {
      const event = {
        summary: "Test Event",
        start: { dateTime: "2024-07-25T10:00:00Z" },
        end: { dateTime: "2024-07-25T11:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      CheckConflict.modifyEventLocally(
        event,
        CheckTypes.ModificationType.YES_ADD_LABEL
      );

      expect(event.summary).toBe(
        CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE + "Test Event"
      );
    });

    it("should add conflict prefix to the event summary if modification type is YES_ADD_LABEL", () => {
      const event = {
        summary: CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE + "Test Event",
        start: { dateTime: "2024-07-25T10:00:00Z" },
        end: { dateTime: "2024-07-25T11:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      CheckConflict.modifyEventLocally(
        event,
        CheckTypes.ModificationType.YES_REMOVE_LABEL
      );

      expect(event.summary).toBe("Test Event");
    });
  });
});
