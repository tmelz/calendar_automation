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

    it("should ensure duplicate oncalls wont create duplicate events", () => {
      // Two oncalls with identical user, time, and schedule
      const oncall1 = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      const oncall2 = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      // Single matching event that could match both oncalls
      const matchingEvent: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const oncalls = [oncall1, oncall2];
      const teamCalendarOncallEvents = [matchingEvent];

      const changes = TeamCalendarOncall.getChanges(
        oncalls,
        teamCalendarOncallEvents
      );

      expect(changes.deleteEvents).toHaveLength(0);
      expect(changes.newTimeRangeEvents).toHaveLength(0);
    });

    it("should correctly handle multiple matching events and oncalls with 1:1 mapping", () => {
      // Create three oncalls
      const oncall1 = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      const oncall2 = {
        start: "2023-10-03T08:00:00Z",
        end: "2023-10-03T16:00:00Z",
        user: { name: "Bob", email: "bob@example.com" },
        schedule: { summary: "Secondary" },
      } as Pagerduty.OnCall;

      const oncall3 = {
        start: "2023-10-04T08:00:00Z",
        end: "2023-10-04T16:00:00Z",
        user: { name: "Charlie", email: "charlie@example.com" },
        schedule: { summary: "Tertiary" },
      } as Pagerduty.OnCall;

      // Create three matching events in a different order
      const event1: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Bob (bob@example.com), schedule: Secondary",
        start: { dateTime: "2023-10-03T08:00:00Z" },
        end: { dateTime: "2023-10-03T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const event2: FakeCalendarEvent = {
        id: "2",
        summary: "[oncall] Charlie (charlie@example.com), schedule: Tertiary",
        start: { dateTime: "2023-10-04T08:00:00Z" },
        end: { dateTime: "2023-10-04T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const event3: FakeCalendarEvent = {
        id: "3",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      // // Add duplicate event that should be removed
      const event4: FakeCalendarEvent = {
        id: "4",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const oncalls = [oncall1, oncall2, oncall3];
      const teamCalendarOncallEvents = [event1, event2, event3, event4];

      const changes = TeamCalendarOncall.getChanges(
        oncalls,
        teamCalendarOncallEvents
      );

      expect(changes).toEqual({
        deleteEvents: [event4],
        newTimeRangeEvents: [],
      });
    });

    it("should correctly handle multiple oncalls that match the same event criteria", () => {
      // Three oncalls with identical characteristics but different IDs (simulating multiple escalation policies)
      const oncall1 = {
        id: "oncall1",
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      const oncall2 = {
        id: "oncall2",
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      const oncall3 = {
        id: "oncall3",
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      // Only one matching event in the calendar
      const event: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const oncalls = [oncall1, oncall2, oncall3];
      const teamCalendarOncallEvents = [event];

      const changes = TeamCalendarOncall.getChanges(
        oncalls,
        teamCalendarOncallEvents
      );

      expect(changes).toEqual({
        deleteEvents: [],
        newTimeRangeEvents: [],
      });
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

    it("should return true for a valid oncall event with attendees (for inviteOncallEmail)", () => {
      const validEvent = {
        summary: "[oncall] Someone (someone@example.com), schedule: Standard",
        eventType: "default",
        attendees: [{ email: "someone@example.com" }],
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

  describe("deduplicateOncalls", () => {
    it("should remove duplicate oncalls with the same user, time range, and schedule", () => {
      const oncalls: Pagerduty.OnCall[] = [
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Primary" },
        },
        // Duplicate entry with same user, start/end times, and schedule
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Primary" },
        },
        // Different user, should be kept
        {
          user: { name: "Bob", email: "bob@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Primary" },
        },
      ] as Pagerduty.OnCall[];

      const result = TeamCalendarOncall.deduplicateOncalls(oncalls);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("alice@example.com");
      expect(result[1].user.email).toBe("bob@example.com");
    });

    it("should keep oncalls with the same user but different time ranges", () => {
      const oncalls: Pagerduty.OnCall[] = [
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Primary" },
        },
        // Same user, different time range
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-11T08:00:00Z",
          end: "2023-10-11T16:00:00Z",
          schedule: { summary: "Primary" },
        },
      ] as Pagerduty.OnCall[];

      const result = TeamCalendarOncall.deduplicateOncalls(oncalls);

      expect(result).toHaveLength(2);
      expect(result[0].start).toBe("2023-10-10T08:00:00Z");
      expect(result[1].start).toBe("2023-10-11T08:00:00Z");
    });

    it("should keep oncalls with the same user and time range but different schedules", () => {
      const oncalls: Pagerduty.OnCall[] = [
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Primary" },
        },
        // Same user and time range, different schedule
        {
          user: { name: "Alice", email: "alice@example.com" },
          start: "2023-10-10T08:00:00Z",
          end: "2023-10-10T16:00:00Z",
          schedule: { summary: "Secondary" },
        },
      ] as Pagerduty.OnCall[];

      const result = TeamCalendarOncall.deduplicateOncalls(oncalls);

      expect(result).toHaveLength(2);
      expect(result[0].schedule.summary).toBe("Primary");
      expect(result[1].schedule.summary).toBe("Secondary");
    });

    it("should return an empty array when given an empty array", () => {
      const result = TeamCalendarOncall.deduplicateOncalls([]);

      expect(result).toHaveLength(0);
    });
  });

  describe("groupOncallSettingsByCalendar", () => {
    it("should correctly group oncall settings by calendar ID", () => {
      const settings = [
        { calendarId: "cal1", scheduleId: "sched1" },
        { calendarId: "cal1", scheduleId: "sched2" },
        { calendarId: "cal2", scheduleId: "sched3" },
      ];

      const result = TeamCalendarOncall.groupOncallSettingsByCalendar(settings);

      expect(result.size).toBe(2);
      expect(result.get("cal1")).toEqual(["sched1", "sched2"]);
      expect(result.get("cal2")).toEqual(["sched3"]);
    });

    it("should throw error for empty calendar or schedule IDs", () => {
      const settingsWithEmptyCalendar = [
        { calendarId: "", scheduleId: "sched1" },
      ];
      const settingsWithEmptySchedule = [
        { calendarId: "cal1", scheduleId: " " },
      ];

      expect(() =>
        TeamCalendarOncall.groupOncallSettingsByCalendar(
          settingsWithEmptyCalendar
        )
      ).toThrow("invariant violation");

      expect(() =>
        TeamCalendarOncall.groupOncallSettingsByCalendar(
          settingsWithEmptySchedule
        )
      ).toThrow("invariant violation");
    });

    it("should return empty map for empty input", () => {
      const result = TeamCalendarOncall.groupOncallSettingsByCalendar([]);
      expect(result.size).toBe(0);
    });
  });

  describe("doesEventNeedUpdate", () => {
    const oncall = {
      start: "2023-10-02T08:00:00Z",
      end: "2023-10-02T16:00:00Z",
      user: { name: "Alice", email: "alice@example.com" },
      schedule: { summary: "Primary" },
    } as Pagerduty.OnCall;

    it("should return true when inviteOncallEmail is true but event has no attendees", () => {
      const event = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: undefined,
        transparency: "opaque",
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.doesEventNeedUpdate(
        event,
        oncall,
        true
      );
      expect(result).toBe(true);
    });

    it("should return true when inviteOncallEmail is true but event is not transparent", () => {
      const event = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: [{ email: "alice@example.com" }],
        transparency: "opaque",
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.doesEventNeedUpdate(
        event,
        oncall,
        true
      );
      expect(result).toBe(true);
    });

    it("should return false when inviteOncallEmail is true and event is properly configured", () => {
      const event = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: [{ email: "alice@example.com" }],
        transparency: "transparent",
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.doesEventNeedUpdate(
        event,
        oncall,
        true
      );
      expect(result).toBe(false);
    });

    it("should return true when inviteOncallEmail is false but event has attendees", () => {
      const event = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: [{ email: "alice@example.com" }],
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.doesEventNeedUpdate(
        event,
        oncall,
        false
      );
      expect(result).toBe(true);
    });

    it("should return false when inviteOncallEmail is false and event has no attendees", () => {
      const event = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: undefined,
      } as GoogleAppsScript.Calendar.Schema.Event;

      const result = TeamCalendarOncall.doesEventNeedUpdate(
        event,
        oncall,
        false
      );
      expect(result).toBe(false);
    });
  });

  describe("getChanges with inviteOncallEmail parameter", () => {
    it("should identify events that need updating when inviteOncallEmail is true", () => {
      // Sample oncall that should match an existing event and require update
      const oncall = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      // Create a matching event that needs update (no attendees and not transparent)
      const event: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: undefined,
        transparency: "opaque",
      } as FakeCalendarEvent;

      const changes = TeamCalendarOncall.getChanges([oncall], [event], true);

      // Expect the event to be marked for update
      expect(changes.updateEvents).toHaveLength(1);
      expect(changes.updateEvents[0]).toMatchObject({
        event: { id: "1" },
        oncall: { user: { email: "alice@example.com" } },
      });
      expect(changes.deleteEvents).toHaveLength(0);
      expect(changes.newTimeRangeEvents).toHaveLength(0);
    });

    it("should identify events that need updating when inviteOncallEmail is false", () => {
      // Sample oncall that should match an existing event and require update
      const oncall = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      // Create a matching event that needs update (has attendees but should not)
      const event: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        attendees: [{ email: "alice@example.com" }],
      } as FakeCalendarEvent;

      const changes = TeamCalendarOncall.getChanges([oncall], [event], false);

      // Expect the event to be marked for update
      expect(changes.updateEvents).toHaveLength(1);
      expect(changes.updateEvents[0]).toMatchObject({
        event: { id: "1" },
        oncall: { user: { email: "alice@example.com" } },
      });
      expect(changes.deleteEvents).toHaveLength(0);
      expect(changes.newTimeRangeEvents).toHaveLength(0);
    });

    it("should identify events needing update, deletion, and creation all at once", () => {
      // Sample oncalls
      const oncall1 = {
        start: "2023-10-02T08:00:00Z",
        end: "2023-10-02T16:00:00Z",
        user: { name: "Alice", email: "alice@example.com" },
        schedule: { summary: "Primary" },
      } as Pagerduty.OnCall;

      const oncall2 = {
        start: "2023-10-03T08:00:00Z",
        end: "2023-10-03T16:00:00Z",
        user: { name: "Bob", email: "bob@example.com" },
        schedule: { summary: "Secondary" },
      } as Pagerduty.OnCall;

      // Event that needs updating (should have attendee)
      const event1: FakeCalendarEvent = {
        id: "1",
        summary: "[oncall] Alice (alice@example.com), schedule: Primary",
        start: { dateTime: "2023-10-02T08:00:00Z" },
        end: { dateTime: "2023-10-02T16:00:00Z" },
        eventType: "default",
        transparency: "transparent",
      } as FakeCalendarEvent;

      // Event that should be deleted (no matching oncall)
      const event2: FakeCalendarEvent = {
        id: "2",
        summary: "[oncall] Charlie (charlie@example.com), schedule: Tertiary",
        start: { dateTime: "2023-10-04T08:00:00Z" },
        end: { dateTime: "2023-10-04T16:00:00Z" },
        eventType: "default",
      } as FakeCalendarEvent;

      const changes = TeamCalendarOncall.getChanges(
        [oncall1, oncall2],
        [event1, event2],
        true
      );

      // Event1 should be updated, event2 should be deleted, oncall2 should create a new event
      expect(changes.updateEvents).toHaveLength(1);
      expect(changes.updateEvents[0].event.id).toBe("1");

      expect(changes.deleteEvents).toHaveLength(1);
      expect(changes.deleteEvents[0].id).toBe("2");

      expect(changes.newTimeRangeEvents).toHaveLength(1);
      expect(changes.newTimeRangeEvents[0].title).toContain("Bob");
    });
  });
});
