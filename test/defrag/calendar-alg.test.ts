import { WorkingHours } from "../../src/defrag/working-hours";
import { lunchEvent, myOneOnOneEvent } from "../checks/event-data";
import { CalendarAlg } from "../../src/defrag/calendar-alg";
import { EventRecurrence } from "../../src/defrag/event-recurrence";

describe("CalendarAlg.getAlternateStartTimeOptions", () => {
  it("finds openings, respecting work hours and conflicts", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        id: "1",
        start: { dateTime: "2024-08-19T09:00:00-07:00" },
        end: { dateTime: "2024-08-19T10:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "2",
        start: { dateTime: "2024-08-19T11:00:00-07:00" },
        end: { dateTime: "2024-08-19T12:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "3",
        start: { dateTime: "2024-08-20T09:00:00-07:00" },
        end: { dateTime: "2024-08-20T10:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "4",
        start: { dateTime: "2024-08-20T11:00:00-07:00" },
        end: { dateTime: "2024-08-20T12:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "5",
        start: { dateTime: "2024-08-21T09:00:00-07:00" },
        end: { dateTime: "2024-08-21T10:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "6",
        start: { dateTime: "2024-08-21T11:00:00-07:00" },
        end: { dateTime: "2024-08-21T12:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "7",
        start: { dateTime: "2024-08-22T09:00:00-07:00" },
        end: { dateTime: "2024-08-22T10:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "8",
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "9",
        start: { dateTime: "2024-08-23T09:00:00-07:00" },
        end: { dateTime: "2024-08-23T10:00:00-07:00" },
      },

      {
        ...myOneOnOneEvent,
        id: "10",
        start: { dateTime: "2024-08-23T11:00:00-07:00" },
        end: { dateTime: "2024-08-23T12:00:00-07:00" },
      },
    ];
    const eventsMap = new Map();
    events.forEach((event) => {
      eventsMap.set(event.id!, event);
    });
    const theirEvents = new Map();
    theirEvents.set("jane.doe@example.com", [
      {
        ...myOneOnOneEvent,
        id: "11",
        start: { dateTime: "2024-08-19T13:00:00-07:00" },
        end: { dateTime: "2024-08-19T14:00:00-07:00" },
      },
    ]);
    const theirWorkingHours = new Map();
    theirWorkingHours.set("jane.doe@example.com", {
      startTimeSeconds: 9 * 3600,
      endTimeSeconds: 16 * 3600,
    });
    const moveableEvents = new Set<string>();
    // add strings 1-10 to moveableEvents
    for (let i = 1; i <= 10; i++) {
      moveableEvents.add(i.toString());
    }
    const moveableEventTimings = new Map();
    // for each event, add the event id and the event start and end times to moveableEventTimings
    events.forEach((event) => {
      moveableEventTimings.set(event.id!, {
        dayOfWeek: new Date(event.start!.dateTime!).getDay(),
        startTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(
          new Date(event.start!.dateTime!)
        ),
        endTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(
          new Date(event.end!.dateTime!)
        ),
      });
    });
    const inputs: CalendarAlg.Inputs = {
      myEvents: eventsMap,
      myEventsList: events,
      myWorkingHours: {
        startTimeSeconds: 9 * 3600,
        endTimeSeconds: 17 * 3600,
      },
      theirEvents: theirEvents,
      theirWorkingHours: theirWorkingHours,
      moveableEvents,
      moveableEventTimings,
      recurrenceSchedule: new Map(),
    };
    const currentSolution = new Map();
    currentSolution.set(events[1].id, {
      dayOfWeek: 2,
      startTimeOfDaySeconds: 10 * 60 * 60,
      endTimeOfDaySeconds: 11 * 60 * 60,
    });

    const options = CalendarAlg.getAlternateStartTimeOptions(
      inputs.myEventsList,
      inputs.myWorkingHours,
      inputs.theirEvents,
      inputs.theirWorkingHours,
      currentSolution,
      events[0],
      new Map([["1", EventRecurrence.RecurrenceType.WEEKLY]])
    );
    options.forEach((date) => console.log(date.toISOString()));
    expect(options).toEqual([
      //// Monday
      new Date("2024-08-19T09:00:00-07:00"),
      new Date("2024-08-19T09:30:00-07:00"),
      new Date("2024-08-19T10:00:00-07:00"),
      new Date("2024-08-19T10:30:00-07:00"),
      new Date("2024-08-19T11:00:00-07:00"),
      new Date("2024-08-19T11:30:00-07:00"),
      new Date("2024-08-19T12:00:00-07:00"),
      // These timings would conflict
      // new Date("2024-08-19T12:30:00-07:00"),
      // new Date("2024-08-19T13:00:00-07:00"),
      // new Date("2024-08-19T13:30:00-07:00"),
      new Date("2024-08-19T14:00:00-07:00"),
      new Date("2024-08-19T14:30:00-07:00"),
      new Date("2024-08-19T15:00:00-07:00"),
      // These dates are after their working hours
      // new Date("2024-08-19T15:30:00-07:00"),
      // new Date("2024-08-19T16:00:00-07:00"),

      //// Tuesday
      // this conflicts with current solution
      // new Date("2024-08-20T10:00:00-07:00"),
      new Date("2024-08-20T12:00:00-07:00"),
      new Date("2024-08-20T12:30:00-07:00"),
      new Date("2024-08-20T13:00:00-07:00"),
      new Date("2024-08-20T13:30:00-07:00"),
      new Date("2024-08-20T14:00:00-07:00"),
      new Date("2024-08-20T14:30:00-07:00"),
      new Date("2024-08-20T15:00:00-07:00"),
      // These dates are after their working hours
      // new Date("2024-08-20T15:30:00-07:00"),
      // new Date("2024-08-20T16:00:00-07:00"),
      new Date("2024-08-21T10:00:00-07:00"),
      new Date("2024-08-21T12:00:00-07:00"),
      new Date("2024-08-21T12:30:00-07:00"),
      new Date("2024-08-21T13:00:00-07:00"),
      new Date("2024-08-21T13:30:00-07:00"),
      new Date("2024-08-21T14:00:00-07:00"),
      new Date("2024-08-21T14:30:00-07:00"),
      new Date("2024-08-21T15:00:00-07:00"),
    ]);

    // expect(
    //   SimulatedAnnealing.chooseAlternateStartTime(inputs, events[0], 0)
    // ).toBeDefined();

    // const result = SimulatedAnnealing.runSim(inputs);

    // expect(result).toEqual({
    //   meetingHours: 0,
    //   longestMeetingStretchHours: 0,
    //   focusTimeOneHourPlus: 8,
    // });
  });
});
