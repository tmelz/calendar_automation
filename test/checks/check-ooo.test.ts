import { jest } from "@jest/globals";
import {
  myOneOnOneEventWithOOOConflict,
  theirIrrelevantEvent,
  theirOOOAllDayEvent,
  theirOOOSpecificTimeEvent,
  theirOverlappingButNonOOOEvent,
  theirOOOLongTermMultiDayEvent,
} from "./event-data";
import { CheckOOO } from "../../src/checks/check-ooo";
import { CheckTypes } from "../../src/checks/check-types";

describe("checkIfEventIsOOOAndOverlaps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true if all day OOO event that overlaps", () => {
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOOOAllDayEvent
      )
    ).toBe(true);
  });

  it("should return true if multi day OOO event that overlaps", () => {
    const theierOOOMultiDayEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...theirOOOAllDayEvent,
      start: { date: "2024-07-30" },
      end: { date: "2024-08-05" },
    };
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theierOOOMultiDayEvent
      )
    ).toBe(true);
  });

  it("should return true if multi day OOO event that overlaps", () => {
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOOOLongTermMultiDayEvent
      )
    ).toBe(true);
  });

  it("should return true if conflicts with OOO specific time event", () => {
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOOOSpecificTimeEvent
      )
    ).toBe(true);
  });

  it("should return false if no conflict with OOO specific time event", () => {
    const theirOOOSpecificTimeEventNonConflicting: GoogleAppsScript.Calendar.Schema.Event =
      {
        ...theirOOOSpecificTimeEvent,
        end: {
          dateTime: "2024-07-31T18:00:00-07:00",
          timeZone: "America/Los_Angeles",
        },
        start: {
          timeZone: "America/Los_Angeles",
          dateTime: "2024-07-31T16:00:00-07:00",
        },
      };
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOOOSpecificTimeEventNonConflicting
      )
    ).toBe(false);
  });

  it("should return false if events do not overlap (and non-OOO anyway)", () => {
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirIrrelevantEvent
      )
    ).toBe(false);
  });

  it("should return false if events overlap but event isnt OOO", () => {
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOverlappingButNonOOOEvent
      )
    ).toBe(false);
  });

  // Regression tests for the cross-timezone bug: a Workday all-day OOO block
  // for an Australian Monday spans Sun 07:00 - Mon 07:00 Pacific, so US Monday
  // meetings after that must NOT be flagged.
  describe("attendee in a different timezone (Australia)", () => {
    // Workday convention: single-day all-day event with end.date == start.date
    const theirAussieMondayOOO: GoogleAppsScript.Calendar.Schema.Event = {
      ...theirOOOAllDayEvent,
      start: { date: "2026-07-13" },
      end: { date: "2026-07-13" },
    };

    it("should not flag a US Monday meeting after their Monday OOO ended", () => {
      const myMondayAfternoonMeeting: GoogleAppsScript.Calendar.Schema.Event =
        {
          ...myOneOnOneEventWithOOOConflict,
          // Mon Jul 13 3:05PM PT == Tue Jul 14 8:05AM in Sydney
          start: { dateTime: "2026-07-13T15:05:00-07:00" },
          end: { dateTime: "2026-07-13T15:30:00-07:00" },
        };
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(
          myMondayAfternoonMeeting,
          theirAussieMondayOOO,
          "Australia/Sydney"
        )
      ).toBe(false);
    });

    it("should flag a US Sunday meeting that falls during their Monday OOO", () => {
      const mySundayMeeting: GoogleAppsScript.Calendar.Schema.Event = {
        ...myOneOnOneEventWithOOOConflict,
        // Sun Jul 12 4:00PM PT == Mon Jul 13 9:00AM in Sydney
        start: { dateTime: "2026-07-12T16:00:00-07:00" },
        end: { dateTime: "2026-07-12T16:30:00-07:00" },
      };
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(
          mySundayMeeting,
          theirAussieMondayOOO,
          "Australia/Sydney"
        )
      ).toBe(true);
    });

    it("should flag a US Monday morning meeting that still overlaps their Monday OOO", () => {
      const myEarlyMondayMeeting: GoogleAppsScript.Calendar.Schema.Event = {
        ...myOneOnOneEventWithOOOConflict,
        // Mon Jul 13 6:00AM PT == Mon Jul 13 11:00PM in Sydney
        start: { dateTime: "2026-07-13T06:00:00-07:00" },
        end: { dateTime: "2026-07-13T06:30:00-07:00" },
      };
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(
          myEarlyMondayMeeting,
          theirAussieMondayOOO,
          "Australia/Sydney"
        )
      ).toBe(true);
    });
  });

  it("should respect the exclusive end date of standard all-day events", () => {
    // Google's convention: a single-day all-day event on Jul 30 has end Jul 31
    const theirStandardAllDayOOO: GoogleAppsScript.Calendar.Schema.Event = {
      ...theirOOOAllDayEvent,
      start: { date: "2024-07-30" },
      end: { date: "2024-07-31" },
    };
    // Meeting is on Jul 31 PT; the old inclusive check would over-flag it
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirStandardAllDayOOO,
        "America/Los_Angeles"
      )
    ).toBe(false);
  });

  it("should return false if their OOO all day event is in the future", () => {
    const theirOOOEventInTheFuture: GoogleAppsScript.Calendar.Schema.Event = {
      ...theirOOOAllDayEvent,
      start: { date: "2024-08-05" },
      end: { date: "2024-08-05" },
    };
    expect(
      CheckOOO.checkIfEventIsOOOAndOverlaps(
        myOneOnOneEventWithOOOConflict,
        theirOOOEventInTheFuture
      )
    ).toBe(false);
  });
});

describe("modifyEventLocally", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add OOO prefix to the event summary if not already present", () => {
    const event = {
      ...myOneOnOneEventWithOOOConflict,
      summary: "Team Meeting",
    };
    CheckOOO.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(
      CheckOOO.OOO_TITLE_PREFIX_NOTICE + "Team Meeting"
    );
  });

  it("should not modify the event summary if OOO prefix is already present", () => {
    const event = {
      ...myOneOnOneEventWithOOOConflict,
      summary: CheckOOO.OOO_TITLE_PREFIX_NOTICE + "Team Meeting",
    };
    CheckOOO.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(
      CheckOOO.OOO_TITLE_PREFIX_NOTICE + "Team Meeting"
    );
  });

  it("should handle event with empty summary", () => {
    const event = { ...myOneOnOneEventWithOOOConflict, summary: "" };
    CheckOOO.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(CheckOOO.OOO_TITLE_PREFIX_NOTICE);
  });

  it("should handle event with undefined summary", () => {
    const event = { ...myOneOnOneEventWithOOOConflict, summary: undefined };
    CheckOOO.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(CheckOOO.OOO_TITLE_PREFIX_NOTICE);
  });

  it("should remove title from event", () => {
    const title = "foobar";
    const event = {
      ...myOneOnOneEventWithOOOConflict,
      summary: CheckOOO.OOO_TITLE_PREFIX_NOTICE + title,
    };
    CheckOOO.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_REMOVE_LABEL
    );
    expect(event.summary).toBe(title);
  });
});
