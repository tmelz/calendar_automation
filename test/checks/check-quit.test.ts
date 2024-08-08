import { jest } from "@jest/globals";
import { myOneOnOneEvent } from "./event-data";
import { CheckQuit } from "../../src/checks/check-quit";
import { CheckTypes } from "../../src/checks/check-types";
import { GetEvents } from "../../src/checks/get-events";

describe("CheckQuit.checkShouldModifyEvent", () => {
  test("should return YES_ADD_LABEL for an event with attendees from same domain and with undefined calendar call", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        { email: "test@block.xyz" },
        { email: "another@squareup.com" },
      ],
    };
    const mockGetEvents = jest.fn().mockReturnValue(undefined);
    expect(
      CheckQuit.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(CheckTypes.ModificationType.YES_ADD_LABEL);
  });

  test("should return undefined for an event with attendees from same domain and with defined result for calendar call", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        { email: "test@block.xyz" },
        { email: "another@squareup.com" },
      ],
    };
    const mockGetEvents = jest.fn().mockReturnValue([event]);
    expect(
      CheckQuit.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });

  test("should return undefined for an event with mixed email domains", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        { email: "test@block.xyz" },
        { email: "another@example.com" },
      ],
    };
    const mockGetEvents = jest.fn().mockReturnValue([event]);
    expect(
      CheckQuit.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(undefined);
  });
  test("should return YES_REMOVE_LABEL for an event with quit note prefix and defined result for calendar call", () => {
    const event = {
      ...myOneOnOneEvent,
      summary: CheckQuit.QUIT_TITLE_PREFIX_NOTICE + "Meeting",
      description: CheckQuit.QUIT_DESCRIPTION_BLURB,
      attendees: [
        { email: "test@block.xyz" },
        { email: "another@squareup.com" },
      ],
    };
    const mockGetEvents = jest.fn().mockReturnValue([event]);
    expect(
      CheckQuit.checkShouldModifyEvent(
        event,
        mockGetEvents as GetEvents.EventFetcherWithError
      )
    ).toBe(CheckTypes.ModificationType.YES_REMOVE_LABEL);
  });
});

describe("CheckQuit.modifyEventLocally", () => {
  let event: GoogleAppsScript.Calendar.Schema.Event;

  beforeEach(() => {
    event = { ...myOneOnOneEvent };
  });

  test("should add quit note prefix to the event summary if not present", () => {
    event.summary = "Meeting";
    CheckQuit.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(CheckQuit.QUIT_TITLE_PREFIX_NOTICE + "Meeting");
  });

  test("should not modify event summary if it already contains the quit note prefix", () => {
    event.summary = CheckQuit.QUIT_TITLE_PREFIX_NOTICE + "Meeting";
    CheckQuit.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_ADD_LABEL
    );
    expect(event.summary).toBe(CheckQuit.QUIT_TITLE_PREFIX_NOTICE + "Meeting");
  });
});
