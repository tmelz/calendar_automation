import { TeamCalendarOncall } from "../../src/team_calendar/team-calendar-pagerduty";
import { Pagerduty } from "../../src/pagerduty";
import { myOneOnOneEvent } from "../../test/checks/event-data";

// For the purposes of these tests, we assume that the GoogleAppsScript types
// are available in the global namespace. We alias the calendar event type for clarity.
type FakeCalendarEvent = GoogleAppsScript.Calendar.Schema.Event;

describe("TeamCalendarOncall", () => {
  describe("getChanges", () => {
    it("should mark non-matching events for deletion and missing oncalls for event creation", () => {
      // Sample oncall that should match an existing event.
      const oncall1 = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      // Sample oncall without a matching event (will trigger event creation).
      const oncall2 = {
        start: "2023-10-03T08:00:00Z",
        end: "2023-10-03T16:00:00Z",
        user: { name: "Bob", email: "bob@example.com" },
        schedule: { summary: "Secondary" },
      } as Pagerduty.OnCall;

      // Create a matching event for oncall1.
      const event1: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      // Create an extra event that does not match any oncall (will trigger deletion).
      const event2: FakeCalendarEvent = {
        id: "2",
        summary: "[oncall] Charlie (charlie@example.com), schedule: Tertiary",
        start: { dateTime: "2023-10-04T08:00:00Z" },
        end: { dateTime: "2023-10-04T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      // Cast our fake oncalls array to the expected type.
      const oncalls = [oncall1, oncall2];
      const teamCalendarOncallEvents = [event1, event2];

      const changes = TeamCalendarOncall.getChanges(
        oncalls,
        teamCalendarOncallEvents
      );

      // Expect the extra event (event2) to be marked for deletion.
      expect(changes.deleteEvents).toHaveLength(1);
      expect(changes.deleteEvents[0]).toMatchObject({ id: "2" });

      // Expect that a new event will be created for oncall2.
      expect(changes.newTimeRangeEvents).toHaveLength(1);
      const newEvent = changes.newTimeRangeEvents[0];
      expect(newEvent.title).toBe(
        "[oncall] Bob (bob@example.com), schedule: Secondary"
      );
      expect(newEvent.startDateTime).toBe("2023-10-03T08:00:00Z");
      expect(newEvent.endDateTime).toBe("2023-10-03T16:00:00Z");
    });

    it("should return empty changes when all events and oncalls match", () => {
      const oncall = {
        start: "2023-10-05T09:00:00Z",
        end: "2023-10-05T17:00:00Z",
        user: { name: "Dana", email: "dana@example.com" },
        schedule: { summary: "Oncall" },
      } as Pagerduty.OnCall;

      const event: FakeCalendarEvent = {
        id: "3",
        summary: "[oncall] Dana (dana@example.com), schedule: Oncall",
        start: { dateTime: "2023-10-05T09:00:00Z" },
        end: { dateTime: "2023-10-05T17:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const changes = TeamCalendarOncall.getChanges([oncall], [event]);
      expect(changes.deleteEvents).toHaveLength(0);
      expect(changes.newTimeRangeEvents).toHaveLength(0);
    });
  });

  describe("oncallAndEventMatch", () => {
    const baseOncall = {
      start: "2023-10-02T08:00:00Z",
      end: "2023-10-02T16:00:00Z",
      user: { name: "Alice", email: "alice@example.com" },
      schedule: { summary: "Primary" },
    } as Pagerduty.OnCall;

    it("should return true when oncall and event match exactly", () => {
      const matchingEvent = {
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.oncallAndEventMatch(
        baseOncall,
        matchingEvent
      );
      expect(result).toBe(true);
    });

    it("should return false when the event title does not match", () => {
      const mismatchedEvent = {
        summary: "[oncall] Wrong Name (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.oncallAndEventMatch(
        baseOncall,
        mismatchedEvent
      );
      expect(result).toBe(false);
    });

    it("should return false when the event start time does not match", () => {
      const mismatchedEvent = {
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T09:00:00Z" }, // Different start time
        end: { dateTime: "2023-10-02T16:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.oncallAndEventMatch(
        baseOncall,
        mismatchedEvent
      );
      expect(result).toBe(false);
    });

    it("should return false when the event does not have dateTime defined", () => {
      const missingTimeEvent = {
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: {}, // Missing dateTime
        end: { dateTime: "2023-10-02T16:00:00Z" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.oncallAndEventMatch(
        baseOncall,
        missingTimeEvent
      );
      expect(result).toBe(false);
    });
  });

  describe("isOncallEventOnTeamCalendar", () => {
    it("should return true for a valid oncall event", () => {
      const validEvent = {
        summary: "[oncall] Someone (someone@example.com), schedule: Standard",
        eventType: "default",
        attendees: undefined,
        conferenceData: undefined,
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.isOncallEventOnTeamCalendar(validEvent);
      expect(result).toBe(true);
    });

    it("should return false if the event summary does not start with [oncall]", () => {
      const invalidEvent = {
        summary: "Meeting: Team Sync",
        eventType: "default",
        attendees: undefined,
        conferenceData: undefined,
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result =
        TeamCalendarOncall.isOncallEventOnTeamCalendar(invalidEvent);
      expect(result).toBe(false);
    });

    it("should return false if eventType is not 'default'", () => {
      const invalidEvent = {
        summary: "[oncall] Someone (someone@example.com), schedule: Standard",
        eventType: "outOfOffice",
        attendees: undefined,
        conferenceData: undefined,
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result =
        TeamCalendarOncall.isOncallEventOnTeamCalendar(invalidEvent);
      expect(result).toBe(false);
    });

    it("should return false if attendees are defined", () => {
      const invalidEvent = {
        summary: "[oncall] Someone (someone@example.com), schedule: Standard",
        eventType: "default",
        attendees: [{}],
        conferenceData: undefined,
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result =
        TeamCalendarOncall.isOncallEventOnTeamCalendar(invalidEvent);
      expect(result).toBe(false);
    });

    it("should return false if conferenceData is defined", () => {
      const invalidEvent = {
        summary: "[oncall] Someone (someone@example.com), schedule: Standard",
        eventType: "default",
        attendees: undefined,
        conferenceData: { someKey: "someValue" },
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result =
        TeamCalendarOncall.isOncallEventOnTeamCalendar(invalidEvent);
      expect(result).toBe(false);
    });

    it("should return false for 1:1 event", () => {
      const result =
        TeamCalendarOncall.isOncallEventOnTeamCalendar(myOneOnOneEvent);
      expect(result).toBe(false);
    });
  });
});
