import { CalendarAlg } from "../../src/defrag/calendar-alg";
import { CalendarCost } from "../../src/defrag/calendar-cost";
import { GreedyDefrag } from "../../src/defrag/greedy-defrag";
import { WorkingHours } from "../../src/defrag/working-hours";
import { myOneOnOneEvent } from "../checks/event-data";

describe("GreedyDefrag.main", () => {
  beforeEach(() => {
    global.console = require("console");
  });

  it("TODO", () => {
    const events: GoogleAppsScript.Calendar.Schema.Event[] = [
      {
        ...myOneOnOneEvent,
        id: "1",
        start: { dateTime: "2024-08-19T09:00:00-07:00" },
        end: { dateTime: "2024-08-19T10:00:00-07:00" },
        summary: "event 1",
      },

      {
        ...myOneOnOneEvent,
        id: "2",
        start: { dateTime: "2024-08-19T11:00:00-07:00" },
        end: { dateTime: "2024-08-19T12:00:00-07:00" },
        summary: "event 2",
      },

      {
        ...myOneOnOneEvent,
        id: "3",
        start: { dateTime: "2024-08-20T09:00:00-07:00" },
        end: { dateTime: "2024-08-20T10:00:00-07:00" },
        summary: "event 3",
      },

      {
        ...myOneOnOneEvent,
        id: "4",
        start: { dateTime: "2024-08-20T11:00:00-07:00" },
        end: { dateTime: "2024-08-20T12:00:00-07:00" },
        summary: "event 4",
      },

      {
        ...myOneOnOneEvent,
        id: "5",
        start: { dateTime: "2024-08-21T09:00:00-07:00" },
        end: { dateTime: "2024-08-21T10:00:00-07:00" },
        summary: "event 5",
      },

      {
        ...myOneOnOneEvent,
        id: "6",
        start: { dateTime: "2024-08-21T11:00:00-07:00" },
        end: { dateTime: "2024-08-21T12:00:00-07:00" },
        summary: "event 6",
      },

      {
        ...myOneOnOneEvent,
        id: "7",
        start: { dateTime: "2024-08-22T09:00:00-07:00" },
        end: { dateTime: "2024-08-22T10:00:00-07:00" },
        summary: "event 7",
      },

      {
        ...myOneOnOneEvent,
        id: "8",
        start: { dateTime: "2024-08-22T11:00:00-07:00" },
        end: { dateTime: "2024-08-22T12:00:00-07:00" },
        summary: "event 8",
      },

      {
        ...myOneOnOneEvent,
        id: "9",
        start: { dateTime: "2024-08-23T09:00:00-07:00" },
        end: { dateTime: "2024-08-23T10:00:00-07:00" },
        summary: "event 9",
      },

      {
        ...myOneOnOneEvent,
        id: "10",
        start: { dateTime: "2024-08-23T11:00:00-07:00" },
        end: { dateTime: "2024-08-23T12:00:00-07:00" },
        summary: "event 10",
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
        summary: "event 11",
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
    };

    const solution = GreedyDefrag.main(inputs);
    // CalendarAlg.describeSolution(inputs, solution);
  });
});
