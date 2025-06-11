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

  describe("timezone handling", () => {
    it("should handle OOO event across timezone boundaries correctly", () => {
      // Create an event in Melbourne timezone (UTC+10)
      const melbourneEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...myOneOnOneEventWithOOOConflict,
        start: {
          dateTime: "2024-07-31T09:00:00+10:00", // Wednesday 9am Melbourne
          timeZone: "Australia/Melbourne",
        },
        end: {
          dateTime: "2024-07-31T10:00:00+10:00",
          timeZone: "Australia/Melbourne",
        },
      };

      // Create an OOO event in US East timezone (UTC-4)
      const usEastOOOEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...theirOOOAllDayEvent,
        start: { date: "2024-07-30" }, // Tuesday in US East
        end: { date: "2024-07-31" },
      };

      // The event should NOT be marked as OOO since it's Wednesday in Melbourne
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(melbourneEvent, usEastOOOEvent)
      ).toBe(false);
    });

    it("should handle OOO event in same timezone correctly", () => {
      // Create an event in US East timezone
      const usEastEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...myOneOnOneEventWithOOOConflict,
        start: {
          dateTime: "2024-07-30T09:00:00-04:00", // Tuesday 9am US East
          timeZone: "America/New_York",
        },
        end: {
          dateTime: "2024-07-30T10:00:00-04:00",
          timeZone: "America/New_York",
        },
      };

      // Create an OOO event in same timezone
      const usEastOOOEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...theirOOOAllDayEvent,
        start: { date: "2024-07-30" }, // Tuesday in US East
        end: { date: "2024-07-31" },
      };

      // The event should be marked as OOO since it's Tuesday in US East
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(usEastEvent, usEastOOOEvent)
      ).toBe(true);
    });

    it("should handle OOO event with specific time in different timezone", () => {
      // Create an event in Melbourne timezone
      const melbourneEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...myOneOnOneEventWithOOOConflict,
        start: {
          dateTime: "2024-07-31T09:00:00+10:00", // Wednesday 9am Melbourne
          timeZone: "Australia/Melbourne",
        },
        end: {
          dateTime: "2024-07-31T10:00:00+10:00",
          timeZone: "Australia/Melbourne",
        },
      };

      // Create a specific time OOO event in US East timezone
      const usEastOOOEvent: GoogleAppsScript.Calendar.Schema.Event = {
        ...theirOOOSpecificTimeEvent,
        start: {
          dateTime: "2024-07-30T09:00:00-04:00", // Tuesday 9am US East
          timeZone: "America/New_York",
        },
        end: {
          dateTime: "2024-07-30T17:00:00-04:00",
          timeZone: "America/New_York",
        },
      };

      // The event should NOT be marked as OOO since it's Wednesday in Melbourne
      expect(
        CheckOOO.checkIfEventIsOOOAndOverlaps(melbourneEvent, usEastOOOEvent)
      ).toBe(false);
    });
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
