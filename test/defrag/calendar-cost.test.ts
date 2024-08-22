import { CalendarCost } from "../../src/defrag/calendar-cost";
import { lunchEvent, myOneOnOneEvent } from "../checks/event-data";

describe("calculateCostFactorsPerDay", () => {
  it("should return 8 focus hours for empty day", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 0,
      longestMeetingStretchHours: 0,
      focusTimeOneHourPlus: 8,
    });
  });

  it("should return 7 focus hours for empty day with lunch", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [lunchEvent];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 0,
      longestMeetingStretchHours: 0,
      focusTimeOneHourPlus: 7,
    });
  });

  it("should return 4 focus hours for morning full of meetings", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T09:00:00-07:00" },
        end: { dateTime: "2024-08-22T10:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:00-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 3,
      longestMeetingStretchHours: 3,
      focusTimeOneHourPlus: 4,
    });
  });

  it("should return 0 focus hours for day full of meetings", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T09:00:00-07:00" },
        end: { dateTime: "2024-08-22T10:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:00-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T13:00:00-07:00" },
        end: { dateTime: "2024-08-22T14:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T14:00:00-07:00" },
        end: { dateTime: "2024-08-22T15:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T15:00:00-07:00" },
        end: { dateTime: "2024-08-22T16:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T16:00:00-07:00" },
        end: { dateTime: "2024-08-22T17:00:00-07:00" },
      },
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 7,
      longestMeetingStretchHours: 4,
      focusTimeOneHourPlus: 0,
    });
  });

  it("should return 0 focus hours for day with just a 30 minute gap", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T09:30:00-07:00" },
        end: { dateTime: "2024-08-22T10:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:00-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T13:00:00-07:00" },
        end: { dateTime: "2024-08-22T14:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T14:00:00-07:00" },
        end: { dateTime: "2024-08-22T15:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T15:00:00-07:00" },
        end: { dateTime: "2024-08-22T16:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T16:00:00-07:00" },
        end: { dateTime: "2024-08-22T17:00:00-07:00" },
      },
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 6.5,
      longestMeetingStretchHours: 4,
      focusTimeOneHourPlus: 0,
    });
  });

  it("should return 1 focus hours for day with just a 1 hour gap", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:00-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T13:00:00-07:00" },
        end: { dateTime: "2024-08-22T14:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T14:00:00-07:00" },
        end: { dateTime: "2024-08-22T15:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T15:00:00-07:00" },
        end: { dateTime: "2024-08-22T16:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T16:00:00-07:00" },
        end: { dateTime: "2024-08-22T17:00:00-07:00" },
      },
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 6,
      longestMeetingStretchHours: 4,
      focusTimeOneHourPlus: 1,
    });
  });

  it("should return 1 focus hours for day with just a 1 hour gap", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:30-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T13:00:00-07:00" },
        end: { dateTime: "2024-08-22T14:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T14:00:00-07:00" },
        end: { dateTime: "2024-08-22T15:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T15:00:00-07:00" },
        end: { dateTime: "2024-08-22T16:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T16:00:00-07:00" },
        end: { dateTime: "2024-08-22T17:00:00-07:00" },
      },
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 5.5,
      longestMeetingStretchHours: 4,
      focusTimeOneHourPlus: 1.5,
    });
  });

  it("should return 1 focus hours for day with just a 1 hour gap", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T10:30-07:00" },
        end: { dateTime: "2024-08-22T11:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },
      lunchEvent,

      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T14:00:00-07:00" },
        end: { dateTime: "2024-08-22T15:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T15:00:00-07:00" },
        end: { dateTime: "2024-08-22T16:00:00-07:00" },
      },
      {
        ...myOneOnOneEvent,
        start: { dateTime: "2024-08-22T16:00:00-07:00" },
        end: { dateTime: "2024-08-22T17:00:00-07:00" },
      },
    ];
    const workingHours = {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 17 * 3600,
    };
    const result = CalendarCost.calculateCostFactorsPerDay(
      events,
      new Map(),
      workingHours
    );

    expect(result).toEqual({
      meetingHours: 4.5,
      longestMeetingStretchHours: 3,
      focusTimeOneHourPlus: 2.5,
    });
  });
});
