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
      newAllDayEvents: [],
      newTimeRangeEvents: [
        {
          startDateTime: "2025-04-14T03:00:00-04:00",
          endDateTime: "2025-04-20T03:00:00-04:00",
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
});
