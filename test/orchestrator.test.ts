import { Orchestrator } from "../src/orchestrator";
import { EventUtil } from "../src/checks/event-util";
import { CheckTypes } from "../src/checks/check-types";
import { UserSettings } from "../src/checks/user-settings";
import { CheckColor } from "../src/checks/check-color";
// Mock dependencies
jest.mock("../src/checks/event-util", () => ({
  EventUtil: {
    isOneOnOneWithMe: jest.fn(),
    amITheOrganizer: jest.fn(),
  },
}));

jest.mock("../src/checks/get-events", () => ({
  GetEvents: {
    getEventsForRestOfDay: jest.fn(),
    getEventsThroughEndOfNextWeek: jest.fn(),
  },
}));

declare var globalThis: any;

globalThis.Logger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

globalThis.Calendar = {
  Events: {
    update: jest.fn(),
  },
};

const mockSaveEventChanges = jest.fn();

// These tests are auto-gen and a bit weird, but they seem functional at least
describe("checkEvents", () => {
  const normalEvent: GoogleAppsScript.Calendar.Schema.Event = {
    id: "1",
    summary: "Event 1",
    description: "",
    organizer: { email: "organizer@example.com" },
    guestsCanModify: true,
  };
  const optOutEvent: GoogleAppsScript.Calendar.Schema.Event = {
    id: "2",
    summary: "Event 2",
    description: "[opt_out_automation]",
    organizer: { email: "organizer@example.com" },
    guestsCanModify: true,
  };

  const mockCalendarCheck: CheckTypes.CalendarCheck = {
    id: "mock",
    shouldModifyEvent: jest.fn(),
    modifyEventLocally: jest.fn(),
  };

  const mockUserSettings: UserSettings.Settings = {
    enabled: true,
    checks: {
      outOfOffice: true,
      plusFiveMinutes: true,
      quit: true,
      conflict: true,
      eventColor: true,
    },
    checkSettings: {
      eventColors: CheckColor.createDefaultSettings(),
    },
    teamCalendar: {
      outOfOffice: false,
      oncall: false,
    },
    teamCalendarSettings: {
      outOfOffice: [],
      oncall: [],
    },
  };

  jest.spyOn(UserSettings, "isCheckEnabled").mockImplementation(() => true);

  beforeEach(() => {
    jest.clearAllMocks();
    (mockCalendarCheck.modifyEventLocally as jest.Mock).mockReturnValue([]);
  });

  // TODO inline to checks
  // it("should skip events that are not one-on-one with me", () => {
  //   (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(false);

  //   Orchestrator.checkEvents(
  //     [mockCalendarCheck],
  //     [normalEvent, normalEvent],
  //     mockUserSettings,
  //     true,
  //     mockSaveEventChanges
  //   );

  //   expect(EventUtil.isOneOnOneWithMe).toHaveBeenCalledTimes(2);
  //   expect(mockCalendarCheck.shouldModifyEvent).not.toHaveBeenCalled();
  // });

  it("should skip events with opt-out description", () => {
    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);

    Orchestrator.checkEvents(
      [mockCalendarCheck],
      [normalEvent, optOutEvent],
      mockUserSettings,
      true,
      mockSaveEventChanges
    );

    expect(mockCalendarCheck.shouldModifyEvent).toHaveBeenCalledTimes(1);
    expect(mockCalendarCheck.shouldModifyEvent).not.toHaveBeenCalledWith(
      optOutEvent
    );
  });

  it("should modify events and add them to locallyModifiedEvents", () => {
    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);
    (mockCalendarCheck.shouldModifyEvent as jest.Mock).mockReturnValue(true);

    Orchestrator.checkEvents(
      [mockCalendarCheck],
      [normalEvent, normalEvent],
      mockUserSettings,
      true,
      mockSaveEventChanges
    );

    expect(mockCalendarCheck.shouldModifyEvent).toHaveBeenCalledTimes(2);
    expect(mockCalendarCheck.modifyEventLocally).toHaveBeenCalledTimes(2);
  });

  it("should not save events during a dry run", () => {
    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);
    (mockCalendarCheck.shouldModifyEvent as jest.Mock).mockReturnValue(true);

    Orchestrator.checkEvents(
      [mockCalendarCheck],
      [normalEvent],
      mockUserSettings,
      true,
      mockSaveEventChanges
    );

    expect(mockSaveEventChanges).not.toHaveBeenCalled();
  });

  it("should save events when not a dry run", () => {
    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);
    (mockCalendarCheck.shouldModifyEvent as jest.Mock).mockReturnValue(true);

    Orchestrator.checkEvents(
      [mockCalendarCheck],
      [normalEvent],
      mockUserSettings,
      false,
      mockSaveEventChanges
    );

    expect(mockSaveEventChanges).toHaveBeenCalledTimes(1);
  });

  it("should dedup events by ID", () => {
    const manyEvents = new Array(10).fill(normalEvent);

    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);
    (mockCalendarCheck.shouldModifyEvent as jest.Mock).mockReturnValue(true);

    Orchestrator.checkEvents(
      [mockCalendarCheck],
      manyEvents,
      mockUserSettings,
      false,
      mockSaveEventChanges
    );

    expect(mockSaveEventChanges).toHaveBeenCalledTimes(1);
  });

  it("should handle a large number of events and respect the MAX_EVENTS_ALLOWED_TO_MODIFY limit", () => {
    const manyEvents = Array.from(
      { length: Orchestrator.MAX_EVENTS_ALLOWED_TO_MODIFY + 20 },
      (_, i) => ({
        ...normalEvent,
        id: (i + 1).toString(),
      })
    );

    (EventUtil.isOneOnOneWithMe as jest.Mock).mockReturnValue(true);
    (mockCalendarCheck.shouldModifyEvent as jest.Mock).mockReturnValue(true);

    const result = Orchestrator.checkEvents(
      [mockCalendarCheck],
      manyEvents,
      mockUserSettings,
      false,
      mockSaveEventChanges
    );

    expect(mockSaveEventChanges).toHaveBeenCalledTimes(
      Orchestrator.MAX_EVENTS_ALLOWED_TO_MODIFY
    );
    expect(result).toBe(false);
  });
});

describe("saveEvent", () => {
  let event: GoogleAppsScript.Calendar.Schema.Event;

  beforeEach(() => {
    jest.clearAllMocks();
    event = {
      id: "1",
      summary: "Event 1",
      description: "",
      organizer: { email: "organizer@example.com" },
      guestsCanModify: true,
    };
  });

  it("should save the event when the user is the organizer", () => {
    (EventUtil.amITheOrganizer as jest.Mock).mockReturnValue(true);

    const result = Orchestrator.saveEvent(event);

    expect(Calendar.Events!.update).toHaveBeenCalledWith(
      event,
      event.organizer!.email!,
      event.id!,
      { sendUpdates: "none" }
    );
    expect(result).toBe(true);
  });

  it("should save the event when the user is not the organizer but has modification rights", () => {
    (EventUtil.amITheOrganizer as jest.Mock).mockReturnValue(false);

    const result = Orchestrator.saveEvent(event);

    expect(Calendar.Events!.update).toHaveBeenCalledWith(
      event,
      event.organizer!.email!,
      event.id!,
      { sendUpdates: "none" }
    );
    expect(result).toBe(true);
  });

  it("should not save the event when the user is not the organizer and does not have modification rights", () => {
    (EventUtil.amITheOrganizer as jest.Mock).mockReturnValue(false);
    event.guestsCanModify = false;

    const result = Orchestrator.saveEvent(event);

    expect(Calendar.Events!.update).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should handle errors when trying to save the event on the organizer's calendar", () => {
    (EventUtil.amITheOrganizer as jest.Mock).mockReturnValue(false);
    (Calendar.Events!.update as jest.Mock).mockImplementation(() => {
      throw new Error("Not Found");
    });

    const result = Orchestrator.saveEvent(event);

    expect(Calendar.Events!.update).toHaveBeenCalledWith(
      event,
      event.organizer!.email!,
      event.id!,
      { sendUpdates: "none" }
    );
    expect(result).toBe(false);
  });
});
