// team-calendar-ooo.test.ts

import { jest } from "@jest/globals";
import { TeamCalendarOOO } from "../../src/team_calendar/team-calendar-ooo";

// Mock the Log module to prevent actual logging during tests
jest.mock("../../src/checks/log", () => ({
  Log: {
    logPhase: jest.fn(),
    log: jest.fn(),
  },
}));

// Mock utility functions if necessary
// Assuming isAllDayEvent, isSpecificTimeEvent, createEventTitle are part of TeamCalendarOOO

describe("TeamCalendarOOO.getChangesPerPerson", () => {
  const { getChangesPerPerson } = TeamCalendarOOO;

  // Define a mock GroupMember
  const mockGroupMember: TeamCalendarOOO.GroupMember = {
    email: "john.doe@example.com",
    name: "John Doe",
  };

  // Helper function to create mock events
  const createMockEvent = (
    id: string,
    summary: string,
    start: { date?: string; dateTime?: string; timeZone?: string },
    end: { date?: string; dateTime?: string; timeZone?: string },
    eventType?:
      | "default"
      | "outOfOffice"
      | "focusTime"
      | "workingLocation"
      | undefined
  ): GoogleAppsScript.Calendar.Schema.Event => ({
    id,
    summary,
    start,
    end,
    eventType,
  });

  it("should create new events when there are no existing team calendar events", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-05-01" },
        { date: "2024-05-02" },
        "outOfOffice"
      ),
      createMockEvent(
        "2",
        "Meeting with Client",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-05-01",
          end: "2024-05-02",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [
        {
          startDateTime: "2024-05-03T10:00:00Z",
          endDateTime: "2024-05-03T11:00:00Z",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("it shouldnt create a new event if already matches", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-05-01" },
        { date: "2024-05-02" },
        "outOfOffice"
      ),
      createMockEvent(
        "2",
        "Meeting with Client",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "2",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2024-05-01" },
        { date: "2024-05-02" }
      ),
      createMockEvent(
        "2",
        "[OOO] John Doe (john.doe@example.com)",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should not create or delete events when team calendar events match oooEvents", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-05-01" },
        { date: "2024-05-02" },
        "outOfOffice"
      ),
      createMockEvent(
        "2",
        "Meeting with Client",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2024-05-01" },
        { date: "2024-05-02" }
      ),
      createMockEvent(
        "2",
        "[OOO] John Doe (john.doe@example.com)",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should delete team calendar events that do not match oooEvents and create new ones from oooEvents", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-05-01" },
        { date: "2024-05-02" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2024-05-01" },
        { date: "2024-05-02" }
      ),
      createMockEvent(
        "2",
        "[OOO] John Doe (john.doe@example.com)",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [
        createMockEvent(
          "2",
          "[OOO] John Doe (john.doe@example.com)",
          { dateTime: "2024-05-03T10:00:00Z" },
          { dateTime: "2024-05-03T11:00:00Z" }
        ),
      ],
      newAllDayEvents: [],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle mixed scenarios with some matching and some non-matching team calendar events", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-05-01" },
        { date: "2024-05-02" },
        "outOfOffice"
      ),
      createMockEvent(
        "3",
        "Workshop",
        { dateTime: "2024-05-04T09:00:00Z" },
        { dateTime: "2024-05-04T12:00:00Z" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2024-05-01" },
        { date: "2024-05-02" }
      ),
      createMockEvent(
        "2",
        "[OOO] John Doe (john.doe@example.com)",
        { dateTime: "2024-05-03T10:00:00Z" },
        { dateTime: "2024-05-03T11:00:00Z" }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [
        createMockEvent(
          "2",
          "[OOO] John Doe (john.doe@example.com)",
          { dateTime: "2024-05-03T10:00:00Z" },
          { dateTime: "2024-05-03T11:00:00Z" }
        ),
      ],
      newAllDayEvents: [],
      newTimeRangeEvents: [
        {
          startDateTime: "2024-05-04T09:00:00Z",
          endDateTime: "2024-05-04T12:00:00Z",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("deletes duplicate team calendar entries", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "personal-1",
        "Out of Office",
        { date: "2025-10-06" },
        { date: "2025-10-07" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "team-1",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2025-10-06" },
        { date: "2025-10-07" }
      ),
      createMockEvent(
        "team-2",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2025-10-06" },
        { date: "2025-10-07" }
      ),
      createMockEvent(
        "team-3",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2025-10-06" },
        { date: "2025-10-07" }
      ),
    ];

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges.deleteEvents).toEqual([
      teamCalendarOOOEvents[1],
      teamCalendarOOOEvents[2],
    ]);
    expect(actualChanges.newAllDayEvents).toEqual([]);
    expect(actualChanges.newTimeRangeEvents).toEqual([]);
  });

  it("should avoid creating duplicate new events and filter subset all-day events", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Parent all-day event
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-06-01" },
        { date: "2024-06-05" },
        "outOfOffice"
      ),
      // Subset all-day event
      createMockEvent(
        "2",
        "Half Day",
        { date: "2024-06-02" },
        { date: "2024-06-02" },
        "outOfOffice"
      ),
      // Duplicate all-day event
      createMockEvent(
        "3",
        "Out of Office",
        { date: "2024-06-01" },
        { date: "2024-06-05" },
        "outOfOffice"
      ),
      // Specific time event
      createMockEvent(
        "4",
        "Doctor Appointment",
        { dateTime: "2024-06-06T14:00:00Z" },
        { dateTime: "2024-06-06T15:00:00Z" }
      ),
      // Duplicate specific time event
      createMockEvent(
        "5",
        "Doctor Appointment",
        { dateTime: "2024-06-06T14:00:00Z" },
        { dateTime: "2024-06-06T15:00:00Z" }
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-06-01",
          end: "2024-06-05",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [
        {
          startDateTime: "2024-06-06T14:00:00Z",
          endDateTime: "2024-06-06T15:00:00Z",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle multi day specific time OOO events", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Parent all-day event
      createMockEvent(
        "1",
        "full week OOO monday to fri, midnight to midnight",
        { timeZone: "America/Toronto", dateTime: "2025-04-14T03:00:00-04:00" },
        { dateTime: "2025-04-20T03:00:00-04:00", timeZone: "America/Toronto" },
        "outOfOffice"
      ),
      // Subset all-day event
      createMockEvent(
        "2",
        "monday all day OOO",
        { date: "2025-04-15" },
        { date: "2025-04-16" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-04-15",
          end: "2025-04-21",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("normalizes near 24-hour events to the team calendar timezone", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "melbourne-cup",
        "OOO | Melbourne Cup",
        {
          timeZone: "Australia/Melbourne",
          dateTime: "2025-11-04T00:00:00+11:00",
        },
        {
          timeZone: "Australia/Melbourne",
          dateTime: "2025-11-05T00:00:00+11:00",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "existing-team-event",
        "[OOO] John Doe (john.doe@example.com)",
        { date: "2025-11-04" },
        { date: "2025-11-05" }
      ),
    ];

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges.deleteEvents).toEqual(teamCalendarOOOEvents);
    expect(actualChanges.newAllDayEvents).toEqual([
      {
        start: "2025-11-03",
        end: "2025-11-04",
        title: "[OOO] John Doe (john.doe@example.com)",
      },
    ]);
    expect(actualChanges.newTimeRangeEvents).toEqual([]);
  });

  it("should handle multi day all day event with specific time overlap", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "subset specific time OOO",
        { timeZone: "America/Toronto", dateTime: "2025-04-16T03:00:00-04:00" },
        { dateTime: "2025-04-17T03:00:00-04:00", timeZone: "America/Toronto" },
        "outOfOffice"
      ),
      createMockEvent(
        "2",
        "multiday OOO",
        { date: "2025-04-15" },
        { date: "2025-04-18" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-04-15",
          end: "2025-04-18",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle undefined name in GroupMember correctly", () => {
    const memberWithoutName: TeamCalendarOOO.GroupMember = {
      email: "jane.doe@example.com",
      name: undefined,
    };

    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Out of Office",
        { date: "2024-08-01" },
        { date: "2024-08-02" },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-08-01",
          end: "2024-08-02",
          title: "[OOO] jane.doe@example.com",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      memberWithoutName,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should convert a midnight-to-midnight specific time event to an all-day event", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Modified to use consistent and explicit format
      createMockEvent(
        "1",
        "OOO",
        {
          dateTime: "2025-04-04T00:00:00-04:00", // Explicitly midnight EDT
          timeZone: "America/New_York",
        },
        {
          dateTime: "2025-04-05T00:00:00-04:00", // Explicitly midnight EDT
          timeZone: "America/New_York",
        },
        "outOfOffice"
      ),
      // Another regular all-day event to ensure duplicates/merging works
      createMockEvent(
        "2",
        "OOO - All Day",
        { date: "2025-04-04" }, // All day April 4th
        { date: "2025-04-05" }, // API end date is exclusive
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        // Expecting a single all-day event for April 4th.
        // Note: Relies on getDateStringFromEvent correctly parsing the start/end dateTimes
        // AND the potentially buggy logic using event.start.date which might be undefined.
        // If the underlying code is fixed to use getDateStringFromEvent result, this should pass.
        // Assuming the corrected logic uses getDateStringFromEvent("2025-04-04T00:00:00-04:00") -> "2025-04-04"
        // and getDateStringFromEvent("2025-04-05T00:00:00-04:00") -> "2025-04-05"
        {
          start: "2025-04-04", // Expected date derived from start dateTime
          end: "2025-04-05", // Expected date derived from end dateTime
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    // We need to be careful comparing the newAllDayEvents array, as the order might not be guaranteed
    // if both the specific time event and the all-day event were converted. Let's sort.
    // Also, check the potential bug mentioned above - the test might fail here if the bug exists.
    actualChanges.newAllDayEvents.sort((a, b) =>
      a.start.localeCompare(b.start)
    );
    expectedChanges.newAllDayEvents.sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle multi-day midnight-to-midnight specific time events", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Modified to use consistent format - explicitly midnight in EDT
      createMockEvent(
        "1",
        "OOO - Multi Day",
        {
          dateTime: "2025-04-07T00:00:00-04:00", // Midnight EDT
          timeZone: "America/New_York",
        },
        {
          dateTime: "2025-04-09T00:00:00-04:00", // Midnight EDT
          timeZone: "America/New_York",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        // Expecting a single all-day event covering April 7th and 8th
        // Relies on getDateStringFromEvent correctly producing "2025-04-07" and "2025-04-09"
        // and the conversion logic using these derived dates correctly.
        {
          start: "2025-04-07",
          end: "2025-04-09", // API end date is exclusive
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should filter single-day events that are subsets of a multi-day event, regardless of format", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // The containing multi-day event
      createMockEvent(
        "1",
        "Multi-Day OOO",
        { date: "2024-08-10" },
        { date: "2024-08-13" }, // Covers Aug 10, 11, 12
        "outOfOffice"
      ),
      // Subset single-day event (start == end)
      createMockEvent(
        "2",
        "Single Day (start==end)",
        { date: "2024-08-11" },
        { date: "2024-08-11" }, // Covers Aug 11
        "outOfOffice"
      ),
      // Subset single-day event (end = start + 1)
      createMockEvent(
        "3",
        "Single Day (end=start+1)",
        { date: "2024-08-12" },
        { date: "2024-08-13" }, // Covers Aug 12
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        // Only the multi-day event should remain
        {
          start: "2024-08-10",
          end: "2024-08-13",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    // Basic check is sufficient here as only one event type is expected
    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should filter one of two identical single-day events with different formats", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Single day event (start == end)
      createMockEvent(
        "1",
        "Single Day (start==end)",
        { date: "2024-09-15" },
        { date: "2024-09-15" }, // Covers Sep 15
        "outOfOffice"
      ),
      // Same single day event (end = start + 1)
      createMockEvent(
        "2",
        "Single Day (end=start+1)",
        { date: "2024-09-15" },
        { date: "2024-09-16" }, // Also covers Sep 15
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    // The filter logic should identify these as equivalent and remove one.
    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-09-15",
          end: "2024-09-16",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should filter a 'start == end' single-day event fully contained within a multi-day event", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Multi-Day",
        { date: "2024-08-10" },
        { date: "2024-08-13" },
        "outOfOffice"
      ), // Aug 10, 11, 12
      createMockEvent(
        "2",
        "Single Day",
        { date: "2024-08-11" },
        { date: "2024-08-11" },
        "outOfOffice"
      ), // Aug 11
    ];
    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-08-10",
          end: "2024-08-13",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };
    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );
    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should filter an 'end = start + 1' single-day event fully contained within a multi-day event", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Multi-Day",
        { date: "2024-08-10" },
        { date: "2024-08-13" },
        "outOfOffice"
      ), // Aug 10, 11, 12
      createMockEvent(
        "2",
        "Single Day",
        { date: "2024-08-11" },
        { date: "2024-08-12" },
        "outOfOffice"
      ), // Aug 11
    ];
    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-08-10",
          end: "2024-08-13",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };
    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );
    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should keep only one event when two represent the same single day with different formats", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "1",
        "Single Day (start==end)",
        { date: "2024-09-15" },
        { date: "2024-09-15" },
        "outOfOffice"
      ), // Sep 15
      createMockEvent(
        "2",
        "Single Day (end=start+1)",
        { date: "2024-09-15" },
        { date: "2024-09-16" },
        "outOfOffice"
      ), // Also Sep 15
    ];
    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    // Expect the start==end version based on current filter logic
    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2024-09-15",
          end: "2024-09-16",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };
    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );
    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should convert a nearly 24-hour specific time event to an all-day event", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Event that spans from 10pm on April 3rd to 9:59pm on April 4th (Pacific Time)
      // This is almost a full day on April 4th and should be treated as an all-day event
      createMockEvent(
        "1",
        "Almost Full Day OOO",
        {
          dateTime: "2025-04-03T22:00:00-07:00", // 10:00 PM Pacific
          timeZone: "America/Los_Angeles",
        },
        {
          dateTime: "2025-04-04T21:59:00-07:00", // 9:59 PM Pacific
          timeZone: "America/Los_Angeles",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-04-04", // Should be detected as an all-day event for April 4th
          end: "2025-04-05", // End date is exclusive in the API (means April 4th only)
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle multi-day Workday sync events (10pm to 9:59pm across days)", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Event that spans from 10pm on April 3rd to 9:59pm on April 6th (Pacific Time)
      // This should be converted to an all-day event spanning April 4th through April 7th
      createMockEvent(
        "1",
        "Multi-day OOO",
        {
          dateTime: "2025-04-03T22:00:00-07:00", // 10:00 PM Pacific
          timeZone: "America/Los_Angeles",
        },
        {
          dateTime: "2025-04-06T21:59:00-07:00", // 9:59 PM Pacific
          timeZone: "America/Los_Angeles",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-04-04", // Should start on April 4th
          end: "2025-04-07", // End date is exclusive in the API (means through April 6th)
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle DST-affected 23-hour OOO events from Australia/Sydney", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Event that is 23 hours due to DST transition in Australia/Sydney
      // November 2, 2025: DST starts, clocks move forward 1 hour at 2am
      createMockEvent(
        "1",
        "Out of office",
        {
          dateTime: "2025-11-02T00:00:00+11:00", // Midnight AEDT
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-03T00:00:00+11:00", // Midnight AEDT (23 hours later due to DST)
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-11-01",
          end: "2025-11-02",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should handle DST-affected 25-hour OOO events from Australia/Sydney", () => {
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // Event that is 25 hours due to DST transition in Australia/Sydney
      // April 6, 2025: DST ends, clocks move back 1 hour at 3am
      createMockEvent(
        "1",
        "Out of office",
        {
          dateTime: "2025-04-06T00:00:00+11:00", // Midnight AEDT
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-04-07T00:00:00+10:00", // Midnight AEST (25 hours later due to DST)
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-04-05",
          end: "2025-04-06",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should replace time-range events with all-day events when DST causes type mismatch", () => {
    // This test simulates the scenario where:
    // 1. A user has a 24-hour OOO event in their personal calendar (Australia/Sydney timezone)
    // 2. The team calendar has an old time-range event for the same period (created before the fix)
    // 3. The fix should detect the type mismatch and replace the time-range event with an all-day event
    
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      // 24-hour event from Australia/Sydney that will be converted to synthetic all-day
      createMockEvent(
        "personal-1",
        "Out of office",
        {
          dateTime: "2025-11-08T00:00:00+11:00", // Midnight AEDT
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-09T00:00:00+11:00", // Midnight AEDT (exactly 24 hours)
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
    ];

    // Team calendar has the OLD time-range event (created before the fix)
    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "team-1",
        "[OOO] John Doe (john.doe@example.com)",
        {
          dateTime: "2025-11-08T00:00:00+11:00", // Same time as personal event
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-09T00:00:00+11:00", // Same time as personal event
          timeZone: "Australia/Sydney",
        }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      // The old time-range event should be deleted
      deleteEvents: [teamCalendarOOOEvents[0]],
      // A new all-day event should be created
      newAllDayEvents: [
        {
          start: "2025-11-07",
          end: "2025-11-08",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should replace multiple time-range events with all-day events when DST causes type mismatch", () => {
    // Test with multiple events to ensure the logic works for batch operations
    
    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "personal-1",
        "Out of office",
        {
          dateTime: "2025-11-08T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-09T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
      createMockEvent(
        "personal-2",
        "Out of office",
        {
          dateTime: "2025-11-15T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-16T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "team-1",
        "[OOO] John Doe (john.doe@example.com)",
        {
          dateTime: "2025-11-08T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-09T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        }
      ),
      createMockEvent(
        "team-2",
        "[OOO] John Doe (john.doe@example.com)",
        {
          dateTime: "2025-11-15T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-11-16T00:00:00+11:00",
          timeZone: "Australia/Sydney",
        }
      ),
    ];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [teamCalendarOOOEvents[0], teamCalendarOOOEvents[1]],
      newAllDayEvents: [
        {
          start: "2025-11-07",
          end: "2025-11-08",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
        {
          start: "2025-11-14",
          end: "2025-11-15",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });

  it("should convert 13-hour overnight out-of-office events to all-day events", () => {
    // This verifies events like aat@'s 17:00-06:00 (13 hours) are normalized to full-day holds

    const oooEvents: GoogleAppsScript.Calendar.Schema.Event[] = [
      createMockEvent(
        "personal-1",
        "Out of office",
        {
          dateTime: "2025-10-20T17:00:00+11:00", // 5 PM AEDT
          timeZone: "Australia/Sydney",
        },
        {
          dateTime: "2025-10-21T06:00:00+11:00", // 6 AM AEDT next day (13 hours)
          timeZone: "Australia/Sydney",
        },
        "outOfOffice"
      ),
    ];

    const teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    const expectedChanges: TeamCalendarOOO.CalendarChanges = {
      deleteEvents: [],
      newAllDayEvents: [
        {
          start: "2025-10-21",
          end: "2025-10-22",
          title: "[OOO] John Doe (john.doe@example.com)",
        },
      ],
      newTimeRangeEvents: [],
    };

    const actualChanges = getChangesPerPerson(
      mockGroupMember,
      teamCalendarOOOEvents,
      oooEvents
    );

    expect(actualChanges).toEqual(expectedChanges);
  });
});

describe("TeamCalendarOOO.deduplicatePersonalOOOEvents", () => {
  const { deduplicatePersonalOOOEvents } = TeamCalendarOOO;

  const createMockEvent = (
    id: string,
    summary: string,
    start: { date?: string; dateTime?: string; timeZone?: string },
    end: { date?: string; dateTime?: string; timeZone?: string },
    eventType?:
      | "default"
      | "outOfOffice"
      | "focusTime"
      | "workingLocation"
      | undefined
  ): GoogleAppsScript.Calendar.Schema.Event => ({
    id,
    summary,
    start,
    end,
    eventType,
  });

  it("converts overnight out-of-office events into all-day events", () => {
    const overnightEvent = createMockEvent(
      "overnight-1",
      "Out of office",
      {
        dateTime: "2025-10-20T17:00:00+11:00",
        timeZone: "Australia/Sydney",
      },
      {
        dateTime: "2025-10-21T06:00:00+11:00",
        timeZone: "Australia/Sydney",
      },
      "outOfOffice"
    );

    const result = deduplicatePersonalOOOEvents([overnightEvent]);

    expect(result).toHaveLength(1);
    expect(result[0].start?.date).toBe("2025-10-21");
    expect(result[0].end?.date).toBe("2025-10-22");
    expect(result[0].start?.dateTime).toBeUndefined();
    expect(result[0].id).toContain("-synthetic");
  });

  it("does not convert short non-OOO overnight events", () => {
    const overnightMeeting = createMockEvent(
      "late-meeting",
      "Late night work session",
      {
        dateTime: "2025-10-20T22:00:00-07:00",
        timeZone: "America/Los_Angeles",
      },
      {
        dateTime: "2025-10-21T00:30:00-07:00",
        timeZone: "America/Los_Angeles",
      },
      "default"
    );

    const result = deduplicatePersonalOOOEvents([overnightMeeting]);

    expect(result).toHaveLength(1);
    expect(result[0].start?.dateTime).toBe("2025-10-20T22:00:00-07:00");
    expect(result[0].end?.dateTime).toBe("2025-10-21T00:30:00-07:00");
  });
});

describe("TeamCalendarOOO utility functions", () => {
  describe("shouldExcludeOOOEvent", () => {
    const { shouldExcludeOOOEvent } = TeamCalendarOOO;

    it("should exclude events with 'sleep' in the title", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "1",
        summary: "Sleep time",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(true);
    });

    it("should exclude events with 'hours' in the title", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "2",
        summary: "Working hours",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(true);
    });

    it("should exclude events with keywords in uppercase", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "3",
        summary: "SLEEP TIME",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(true);
    });

    it("should exclude events with keywords in mixed case", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "4",
        summary: "Office Hours",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(true);
    });

    it("should not exclude events without excluded keywords", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "5",
        summary: "Out of Office",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(false);
    });

    it("should not exclude events with undefined summary", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "6",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(false);
    });

    it("should exclude events with keywords as part of larger words", () => {
      const event: GoogleAppsScript.Calendar.Schema.Event = {
        id: "7",
        summary: "Sleepover party",
        start: { date: "2024-05-01" },
        end: { date: "2024-05-02" },
      };
      expect(shouldExcludeOOOEvent(event)).toBe(true);
    });
  });

  describe("isMidnight", () => {
    const { isMidnight } = TeamCalendarOOO;

    it("should return true for an event starting at midnight in its timezone", () => {
      // Modified to use clearer format that doesn't rely on timezone conversion
      const eventStart = {
        dateTime: "2024-05-20T00:00:00-04:00", // Explicitly midnight in EDT
        timeZone: "America/New_York",
      };
      expect(isMidnight(eventStart)).toBe(true);
    });

    it("should return true for an event starting exactly at midnight UTC", () => {
      const eventStart = {
        dateTime: "2024-05-20T00:00:00Z", // Midnight UTC
        timeZone: "UTC",
      };
      expect(isMidnight(eventStart)).toBe(true);
    });

    it("should return false for an event not starting at midnight", () => {
      const eventStart = {
        dateTime: "2024-05-20T00:01:00-04:00", // 1 minute past midnight in EDT
        timeZone: "America/New_York",
      };
      expect(isMidnight(eventStart)).toBe(false);
    });

    it("should return false if dateTime is missing", () => {
      const eventStart = {
        timeZone: "America/New_York",
      };
      expect(isMidnight(eventStart)).toBe(false);
    });

    it("should return false if timeZone is missing", () => {
      // This test remains valid as is
      const eventStart = {
        dateTime: "2024-05-20T04:00:00Z",
      };
      expect(isMidnight(eventStart)).toBe(false);
    });
  });

  describe("getDateStringFromEvent", () => {
    const { getDateStringFromEvent } = TeamCalendarOOO;

    it("should return the correct date string for the given timezone", () => {
      const eventStart = {
        dateTime: "2024-12-31T23:00:00-05:00", // Dec 31st 11 PM EST
        timeZone: "America/New_York",
      };
      expect(getDateStringFromEvent(eventStart)).toBe("2024-12-31");
    });

    it("should return the correct date string when the date differs from UTC", () => {
      const eventStart = {
        dateTime: "2025-01-01T02:00:00Z", // Jan 1st 2 AM UTC
        timeZone: "America/Los_Angeles", // Is Dec 31st 6 PM PST
      };
      expect(getDateStringFromEvent(eventStart)).toBe("2024-12-31");
    });

    it("should return null if dateTime is missing", () => {
      const eventStart = {
        timeZone: "America/New_York",
      };
      expect(getDateStringFromEvent(eventStart)).toBeUndefined();
    });

    it("should default to the team calendar timezone if timeZone is missing", () => {
      const eventStart = {
        dateTime: "2024-12-31T23:00:00-05:00",
      };
      expect(getDateStringFromEvent(eventStart)).toBe("2025-01-01");
    });
  });
});
