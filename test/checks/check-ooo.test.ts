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
