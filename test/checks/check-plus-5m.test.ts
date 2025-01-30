import { jest } from "@jest/globals";
import { myOneOnOneEvent } from "./event-data";
import { CheckPlus5m } from "../../src/checks/check-plus-5m";
import { CheckTypes } from "../../src/checks/check-types";

describe("CheckPlus5m.checkShouldModifyEvent", () => {
  test("should return YES for an event starting on the hour and lasting 30 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:30:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return YES for an event starting on the hour and lasting 25 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:25:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return YES for an event starting on the half-hour and lasting 30 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:30:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T15:00:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return YES for an event starting on the hour and lasting 60 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T15:00:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return YES for an event starting on the hour and lasting 50 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:50:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return YES_ADD_LABEL for an event starting at 5 minutes past the hour but without a label", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:05:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:35:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return undefined for an event starting at 5 minutes past the hour without a label, but i'm not the organizer", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:05:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:35:00-07:00" },
      attendees: [
        {
          responseStatus: "accepted",
          self: true,

          email: "john.doe@example.com",
        },
        {
          email: "jane.doe@example.com",
          responseStatus: "needsAction",
          organizer: true,
        },
      ],
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });

  test("should return undefined for an event starting at 5 minutes past the hour but with a description", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      summary: "Meeting ",
      description: "Description " + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:05:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:35:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });

  test("should return undefined for an event starting at 5 minutes past the hour but with a deprecated title", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      summary: "Meeting " + CheckPlus5m.TITLE_SUFFIX_NOTICES_DEPRECATED[0],
      description: "Description " + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:05:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:35:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
  });

  test("should return undefined for an event lasting 20 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:20:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });

  test("should return undefined for an event lasting 90 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T15:30:00-07:00" },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });

  test("should return undefined when start dateTime is not defined", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: { ...myOneOnOneEvent.start, dateTime: undefined },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });

  test("should return undefined when end dateTime is not defined", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      end: { ...myOneOnOneEvent.end, dateTime: undefined },
    };
    expect(CheckPlus5m.checkShouldModifyEvent(modifiedEvent)).toBe(undefined);
  });
});

describe("CheckPlus5m.modifyEventLocally", () => {
  let event: GoogleAppsScript.Calendar.Schema.Event;

  beforeEach(() => {
    event = { ...myOneOnOneEvent };
  });

  test("should update the start time by +5 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.start!.dateTime!).getMinutes()).toBe(5); // 0 + 5 = 5
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(30);
  });

  test("should not update the start time by +5 minutes if already starting at :05", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:05:00-07:00",
      },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.start!.dateTime!).getMinutes()).toBe(5);
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(30);
  });

  test("should not update the start time by +5 minutes if already starting at :35", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:35:00-07:00",
      },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.start!.dateTime!).getMinutes()).toBe(35);
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(30);
  });

  test("should handle speed meeting setting and update the end time by +5 minutes if the duration is 25 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:25:00-07:00" },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(30); // 25 + 5 = 30
  });

  test("should handle speed meeting setting and update the end time by +10 minutes if the duration is 50 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T14:50:00-07:00" },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(0);
  });

  test("should not update the end time if the duration is not 25 minutes", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      start: {
        ...myOneOnOneEvent.start,
        dateTime: "2024-07-26T14:00:00-07:00",
      },
      end: { ...myOneOnOneEvent.end, dateTime: "2024-07-26T15:00:00-07:00" },
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(new Date(modifiedEvent.end!.dateTime!).getMinutes()).toBe(0); // no change expected
  });

  test("should not update the summary to add +5m note", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      summary: "Meeting",
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(modifiedEvent.summary).toEqual("Meeting");
  });

  test("should remove deprecated note from summary", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      summary: "Meeting " + CheckPlus5m.TITLE_SUFFIX_NOTICES_DEPRECATED[0],
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(modifiedEvent.summary).toBe("Meeting "); // no change expected
  });

  test("should update the description to add the explainer if not already present", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      description: "Description",
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(modifiedEvent.description).toContain(
      CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE
    );
  });

  test("should not update the description if it already contains the explainer", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      description: "Description " + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE,
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(modifiedEvent.description).toBe(
      "Description " + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE
    ); // no change expected
  });

  test("should replace deprecated explainer", () => {
    const modifiedEvent = {
      ...myOneOnOneEvent,
      description:
        "Description " + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICES_DEPRECATED[0],
    };
    CheckPlus5m.modifyEventLocally(
      modifiedEvent,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(modifiedEvent.description).toBe(
      "Description " + "\n" + CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE
    );
  });
});
