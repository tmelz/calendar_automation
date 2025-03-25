import { jest } from "@jest/globals";
import { myOneOnOneEvent } from "./event-data";
import { CheckNotes } from "../../src/checks/check-notes";
import { CheckTypes } from "../../src/checks/check-types";
import { GetEvents } from "../../src/checks/get-events";
import { EventUtil } from "../../src/checks/event-util";

describe("CheckNotes.checkShouldModifyEvent", () => {
  test("should return undefined for a recurring event", () => {
    const event = {
      ...myOneOnOneEvent,
      recurringEventId: "123",
    };
    const mockGetEvents = jest.fn().mockReturnValue([]);
    expect(
      CheckNotes.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });

  test("should return undefined for an event that is not a 1:1", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        { email: "test@example.com", self: true },
        { email: "another@example.com" },
        { email: "third@example.com" },
      ],
    };
    const mockGetEvents = jest.fn().mockReturnValue([]);
    expect(
      CheckNotes.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });

  test("should return undefined for an event that already has attachments", () => {
    const event = {
      ...myOneOnOneEvent,
      attachments: [{ fileUrl: "https://docs.google.com/doc", title: "Notes" }],
    };
    const mockGetEvents = jest.fn().mockReturnValue([]);
    expect(
      CheckNotes.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });

  test("should return undefined if no notes doc is found", () => {
    const event = {
      ...myOneOnOneEvent,
      start: { dateTime: "2023-01-01T10:00:00" },
      attendees: [
        { email: "test@example.com", self: true },
        { email: "another@example.com" },
      ],
      recurringEventId: undefined,
    };

    CheckNotes.notesMapping = new Map();
    const mockGetEvents = jest.fn().mockReturnValue([]);
    expect(
      CheckNotes.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });

  test("should return YES_ADD_NOTES when notes doc is found", () => {
    const event = {
      ...myOneOnOneEvent,
      start: { dateTime: "2023-01-01T10:00:00" },
      attendees: [
        { email: "test@example.com", self: true },
        { email: "another@example.com" },
      ],
      recurringEventId: undefined,
    };

    const attachment = {
      fileUrl: "https://docs.google.com/doc",
      title: "Notes",
    };

    jest
      .spyOn(EventUtil, "getEmailForOtherAttendee")
      .mockReturnValue("another@example.com");

    CheckNotes.notesMapping = new Map();
    CheckNotes.notesMapping.set("another@example.com", attachment);

    const mockGetEvents = jest.fn().mockReturnValue([]);
    expect(
      CheckNotes.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(CheckTypes.ModificationType.YES_ADD_NOTES);
  });
});

describe("CheckNotes.modifyEventLocally", () => {
  test("should return empty array if modification type is not YES_ADD_NOTES", () => {
    const event = { ...myOneOnOneEvent };
    const mockGetEvents = jest.fn().mockReturnValue([]);

    const result = CheckNotes.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL,
      mockGetEvents as GetEvents.EventFetcherWithError
    );

    expect(result).toEqual([]);
  });

  test("should return empty array if no notes doc is found", () => {
    const event = {
      ...myOneOnOneEvent,
      start: { dateTime: "2023-01-01T10:00:00" },
      attendees: [
        { email: "test@example.com", self: true },
        { email: "another@example.com" },
      ],
    };

    CheckNotes.notesMapping = new Map();

    const mockGetEvents = jest.fn().mockReturnValue([]);

    const result = CheckNotes.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_NOTES,
      mockGetEvents as GetEvents.EventFetcherWithError
    );

    expect(result).toEqual([]);
  });

  test("should add attachment and return changelog if notes doc is found", () => {
    const event = {
      ...myOneOnOneEvent,
      summary: "Meeting with John",
      start: { dateTime: "2023-01-01T10:00:00" },
      attendees: [
        { email: "test@example.com", self: true },
        { email: "another@example.com" },
      ],
    };

    const attachment = {
      fileUrl: "https://docs.google.com/doc/123",
      title: "Notes with John",
    };

    CheckNotes.notesMapping = new Map();
    CheckNotes.notesMapping.set("another@example.com", attachment);

    const mockGetEvents = jest.fn().mockReturnValue([]);

    const result = CheckNotes.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_NOTES,
      mockGetEvents as GetEvents.EventFetcherWithError
    );

    expect(event.attachments).toEqual([attachment]);
  });
});

// TODO make work; in general all these auto gen tests are pretty meh quality this time around
// better to commit for now and cleanup later
//
// describe("CheckNotes.createNotesMapping", () => {
//   test("should create mapping from qualifying events", () => {
//     const anchorDate = new Date("2023-01-15");

//     const mockEvents = [
//       {
//         ...myOneOnOneEvent,
//         recurringEventId: "123",
//         attachments: [
//           {
//             fileUrl: "https://docs.google.com/doc/1",
//             title: "Notes with Alice",
//           },
//         ],
//         summary: "Meeting with Alice",
//         attendees: [
//           { email: "me@example.com", self: true },
//           { email: "alice@example.com" },
//         ],
//       },
//       {
//         ...myOneOnOneEvent,
//         recurringEventId: "456",
//         attachments: [
//           {
//             fileUrl: "https://drive.google.com/file/1",
//             title: "Not a Google Doc",
//           },
//         ],
//         summary: "Meeting with Bob",
//         attendees: [
//           { email: "me@example.com", self: true },
//           { email: "bob@example.com" },
//         ],
//       },
//       {
//         ...myOneOnOneEvent,
//         recurringEventId: "789",
//         attachments: [
//           {
//             fileUrl: "https://docs.google.com/doc/3",
//             title: "Notes with Charlie",
//           },
//         ],
//         summary: "Meeting with Charlie",
//         attendees: [
//           { email: "me@example.com", self: true },
//           { email: "charlie@example.com" },
//         ],
//       },
//     ];

//     const mockGetEvents = jest.fn().mockReturnValue(mockEvents);

//     const mapping = CheckNotes.createNotesMapping(
//       anchorDate,
//       mockGetEvents as GetEvents.EventFetcherWithError
//     );

//     expect(mapping).toEqual(new Map());

//     expect(mapping.size).toBe(3);
//     expect(mapping.has("alice@example.com")).toBe(true);
//     expect(mapping.has("charlie@example.com")).toBe(true);
//     expect(mapping.has("bob@example.com")).toBe(true);

//     expect(mapping.get("alice@example.com")).toEqual(
//       mockEvents[0].attachments![0]
//     );
//     expect(mapping.get("charlie@example.com")).toEqual(
//       mockEvents[2].attachments![0]
//     );
//   });
// });
