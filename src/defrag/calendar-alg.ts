import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { Time } from "../checks/time";
import { CalendarCost } from "./calendar-cost";
import { WorkingHours } from "./working-hours";
import { EventRecurrence } from "./event-recurrence";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CalendarAlg {
  export const INPUTS_CACHE_KEY = "calendarAlgInputs_v6";
  export const THEIR_EVENTS_CACHE_KEY_1 = "calendarAlgTheirEvents_v6_1";
  export const THEIR_EVENTS_CACHE_KEY_2 = "calendarAlgTheirEvents_v6_2";
  export const THEIR_EVENTS_CACHE_KEY_3 = "calendarAlgTheirEvents_v6_3";

  export type Inputs = {
    // id ==> event
    myEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event>;
    myEventsList: GoogleAppsScript.Calendar.Schema.Event[];
    myWorkingHours: WorkingHours.TimeRange;
    theirEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>;
    theirWorkingHours: Map<string, WorkingHours.TimeRange>;
    moveableEvents: Set<string>;
    // id ==> timing
    moveableEventTimings: Map<string, CalendarCost.EventTiming>;
    recurrenceSchedule: Map<string, EventRecurrence.RecurrenceType>;
  };

  export function convertDateToEventTiming(
    event: GoogleAppsScript.Calendar.Schema.Event,
    newStartTime: Date
  ): CalendarCost.EventTiming {
    const eventDuration =
      new Date(event.end!.dateTime!).getTime() -
      new Date(event.start!.dateTime!).getTime();

    return {
      dayOfWeek: newStartTime.getDay(),
      startTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(newStartTime),
      endTimeOfDaySeconds:
        WorkingHours.getTimeOfDaySeconds(newStartTime) + eventDuration / 1000, // convert milliseconds to seconds
    };
  }

  export function getAllowedDayDeltas(
    recurrence: EventRecurrence.RecurrenceType | undefined,
    eventDayOfWeek: number
  ): number[] {
    let possibleDayDeltas: number[] = [];
    if (
      recurrence === undefined ||
      recurrence === EventRecurrence.RecurrenceType.DAILY
    ) {
      possibleDayDeltas = [0];
    } else if (recurrence === EventRecurrence.RecurrenceType.WEEKLY) {
      possibleDayDeltas = [0, -1, 1];
      if (eventDayOfWeek === 1) {
        possibleDayDeltas.push(2);
      }
    } else if (
      recurrence === EventRecurrence.RecurrenceType.EVERY_TWO_WEEKS ||
      recurrence === EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS
    ) {
      possibleDayDeltas = [0];
      for (let i = 1; i <= eventDayOfWeek - 1; i++) {
        possibleDayDeltas.push(-1 * i);
      }
      for (let i = 1; i <= 5 - eventDayOfWeek; i++) {
        possibleDayDeltas.push(i);
      }
    }

    return possibleDayDeltas;
  }

  export function getAlternateStartTimeOptions(
    myEventsList: GoogleAppsScript.Calendar.Schema.Event[],
    myWorkingHours: WorkingHours.TimeRange,
    theirEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>,
    theirWorkingHoursMap: Map<string, WorkingHours.TimeRange>,
    currentSolution: Map<string, CalendarCost.EventTiming>,
    event: GoogleAppsScript.Calendar.Schema.Event,
    recurrenceSchedule: Map<string, EventRecurrence.RecurrenceType>
  ): Date[] {
    const theirEmail = EventUtil.getEmailForOtherAttendee(event);
    if (theirEmail === undefined) {
      return [];
    }

    const theirWorkingHours = theirWorkingHoursMap.get(theirEmail);
    if (!theirWorkingHours) {
      return [];
    }

    const eventDuration =
      new Date(event.end!.dateTime!).getTime() -
      new Date(event.start!.dateTime!).getTime();
    const originalStartDate = new Date(event.start!.dateTime!);
    const offsetMinutes = originalStartDate.getMinutes() % 30;

    const newStartTimeOptions: Date[] = [];
    const possibleDayDeltas: number[] = getAllowedDayDeltas(
      recurrenceSchedule.get(event.id!),
      originalStartDate.getDay()
    );

    for (const dayOffset of possibleDayDeltas) {
      const newDate = new Date(originalStartDate);
      newDate.setDate(newDate.getDate() + dayOffset);

      if (newDate.getDay() < 1 || newDate.getDay() > 5) {
        continue;
      }

      const dayStart = new Date(newDate);
      dayStart.setHours(
        Math.floor(myWorkingHours.startTimeSeconds / 3600),
        0,
        0,
        0
      );

      const dayEnd = new Date(newDate);
      dayEnd.setHours(
        Math.floor(myWorkingHours.endTimeSeconds / 3600),
        0,
        0,
        0
      );
      if (newDate.getDay() === 5) {
        dayEnd.setHours(dayEnd.getHours() - 1);
      }

      for (
        let currentStartTime = dayStart.getTime();
        currentStartTime + eventDuration <= dayEnd.getTime();
        currentStartTime += 30 * 60 * 1000
      ) {
        const proposedStart = new Date(
          currentStartTime + offsetMinutes * 60 * 1000
        );
        const proposedEnd = new Date(proposedStart.getTime() + eventDuration);

        const proposedStartSeconds =
          WorkingHours.getTimeOfDaySeconds(proposedStart);
        const proposedEndSeconds =
          WorkingHours.getTimeOfDaySeconds(proposedEnd);

        const theirWorkingHoursEndSeconds =
          newDate.getDay() === 5
            ? theirWorkingHours.endTimeSeconds - 3600
            : theirWorkingHours.endTimeSeconds;

        if (
          proposedStartSeconds >= myWorkingHours.startTimeSeconds &&
          proposedEndSeconds <= myWorkingHours.endTimeSeconds &&
          proposedStartSeconds >= theirWorkingHours.startTimeSeconds &&
          proposedEndSeconds <= theirWorkingHoursEndSeconds
        ) {
          const hasConflict = (
            events: GoogleAppsScript.Calendar.Schema.Event[],
            solution: Map<string, CalendarCost.EventTiming>
          ) =>
            events.some((otherEvent) => {
              if (otherEvent.id === event.id) {
                return false;
              }

              const eventTiming = solution.get(otherEvent.id!);
              const otherStart = eventTiming
                ? (() => {
                    const startDate = new Date(newDate);
                    const dayDifference =
                      eventTiming.dayOfWeek - startDate.getDay();
                    startDate.setDate(startDate.getDate() + dayDifference);
                    startDate.setHours(0, 0, 0, 0);
                    startDate.setSeconds(eventTiming.startTimeOfDaySeconds);
                    return startDate.getTime();
                  })()
                : new Date(otherEvent.start!.dateTime!).getTime();

              const otherEnd = eventTiming
                ? (() => {
                    const endDate = new Date(newDate);
                    const dayDifference =
                      eventTiming.dayOfWeek - endDate.getDay();
                    endDate.setDate(endDate.getDate() + dayDifference);
                    endDate.setHours(0, 0, 0, 0);
                    endDate.setSeconds(eventTiming.endTimeOfDaySeconds);
                    return endDate.getTime();
                  })()
                : new Date(otherEvent.end!.dateTime!).getTime();

              if (otherEvent.start?.date && otherEvent.end?.date) {
                const isOOOEvent =
                  otherEvent.eventType === "outOfOffice" ||
                  otherEvent.summary === "OOO- Automated by Workday";

                if (isOOOEvent) {
                  const oooStart = new Date(otherEvent.start!.date!).getTime();
                  const oooEnd =
                    new Date(otherEvent.end!.date!).getTime() +
                    24 * 60 * 60 * 1000;

                  return (
                    proposedStart.getTime() < oooEnd &&
                    proposedEnd.getTime() > oooStart
                  );
                }
              }

              return (
                proposedStart.getTime() < otherEnd &&
                proposedEnd.getTime() > otherStart
              );
            });

          if (
            !hasConflict(myEventsList, currentSolution) &&
            !hasConflict(theirEvents.get(theirEmail)!, currentSolution)
          ) {
            newStartTimeOptions.push(proposedStart);
          }
        }
      }
    }

    return newStartTimeOptions;
  }

  export function getInputs(refDate: Date): CalendarAlg.Inputs {
    const cache = CacheService.getScriptCache();
    const cachedInputs = cache.get(CalendarAlg.INPUTS_CACHE_KEY);
    const cachedTheirEvents1 = cache.get(CalendarAlg.THEIR_EVENTS_CACHE_KEY_1);
    const cachedTheirEvents2 = cache.get(CalendarAlg.THEIR_EVENTS_CACHE_KEY_2);
    const cachedTheirEvents3 = cache.get(CalendarAlg.THEIR_EVENTS_CACHE_KEY_3);

    if (
      cachedInputs &&
      cachedTheirEvents1 &&
      cachedTheirEvents2 &&
      cachedTheirEvents3
    ) {
      Log.log("Using cached inputs.");
      const inputsWithoutTheirEvents = deserializeInputs(
        JSON.parse(
          Utilities.ungzip(
            Utilities.newBlob(
              Utilities.base64Decode(cachedInputs),
              "application/x-gzip"
            )
          ).getDataAsString()
        )
      ) as CalendarAlg.Inputs;

      const theirEventsPart1 = new Map(
        JSON.parse(
          Utilities.ungzip(
            Utilities.newBlob(
              Utilities.base64Decode(cachedTheirEvents1),
              "application/x-gzip"
            )
          ).getDataAsString()
        )
      );

      const theirEventsPart2 = new Map(
        JSON.parse(
          Utilities.ungzip(
            Utilities.newBlob(
              Utilities.base64Decode(cachedTheirEvents2),
              "application/x-gzip"
            )
          ).getDataAsString()
        )
      );

      const theirEventsPart3 = new Map(
        JSON.parse(
          Utilities.ungzip(
            Utilities.newBlob(
              Utilities.base64Decode(cachedTheirEvents3),
              "application/x-gzip"
            )
          ).getDataAsString()
        )
      );

      const combinedTheirEvents = new Map<
        string,
        GoogleAppsScript.Calendar.Schema.Event[]
      >();

      theirEventsPart1.forEach((value, key) => {
        combinedTheirEvents.set(
          key as string,
          value as GoogleAppsScript.Calendar.Schema.Event[]
        );
      });

      theirEventsPart2.forEach((value, key) => {
        combinedTheirEvents.set(
          key as string,
          value as GoogleAppsScript.Calendar.Schema.Event[]
        );
      });

      theirEventsPart3.forEach((value, key) => {
        combinedTheirEvents.set(
          key as string,
          value as GoogleAppsScript.Calendar.Schema.Event[]
        );
      });

      return {
        ...inputsWithoutTheirEvents,
        theirEvents: combinedTheirEvents,
      } as CalendarAlg.Inputs;
    }

    const startDate = new Date(refDate);
    startDate.setHours(24, 0, 0, 0);
    const endDate = new Date(refDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(24, 0, 0, 0);

    Log.log("Getting next week's events");
    const myEventsList = GetEvents.getEventsForDateRange(
      startDate,
      endDate
    ).filter(
      (event) => !EventUtil.didIRSVPNo(event) && event.eventType !== "focusTime"
    );
    const myEvents = new Map<string, GoogleAppsScript.Calendar.Schema.Event>();
    myEventsList.forEach((event) => {
      myEvents.set(event.id!, event);
    });

    Log.log("Getting my working hours");
    const myWorkingHours =
      WorkingHours.estimateWorkingHours("tmellor@block.xyz");

    const theirEvents = new Map<
      string,
      GoogleAppsScript.Calendar.Schema.Event[]
    >();
    const theirWorkingHours = new Map<string, WorkingHours.TimeRange>();

    const otherPeople = new Set<string>();
    myEventsList
      .filter((event) => EventUtil.isOneOnOneWithMe(event))
      .map((event) => EventUtil.getEmailForOtherAttendee(event))
      .filter((email) => email !== undefined)
      .forEach((email) => {
        Log.log("Getting their events next week");
        theirEvents.set(
          email!,
          GetEvents.getEventsForDateRangeCustomCalendar(
            startDate,
            endDate,
            email!,
            undefined,
            undefined,
            true
          ).filter(
            (event) =>
              !EventUtil.didRSVPNo(event, email) &&
              event.eventType !== "focusTime"
          )
        );
        otherPeople.add(email);

        Log.log("Getting their working hours");
        theirWorkingHours.set(
          email!,
          WorkingHours.estimateWorkingHours(email!)
        );
      });

    const moveableEvents = new Set(
      Array.from(myEvents.values())
        .filter((event) => EventUtil.isOneOnOneWithMe(event))
        .filter(
          (event) =>
            !event.attendees?.some(
              (attendee) => attendee.email === "azra@block.xyz"
            )
        )
        .map((event) => event.id!)
    );
    const moveableEventTimings = new Map<string, CalendarCost.EventTiming>();

    myEvents.forEach((event) => {
      if (moveableEvents.has(event.id!)) {
        const startTime = new Date(event.start!.dateTime!);
        const endTime = new Date(event.end!.dateTime!);
        moveableEventTimings.set(event.id!, {
          dayOfWeek: startTime.getDay(),
          startTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(startTime),
          endTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(endTime),
        });
      }
    });

    const recurrenceSchedule = new Map<
      string,
      EventRecurrence.RecurrenceType
    >();
    moveableEvents.forEach((eventId) => {
      const recurrenceInfo = EventRecurrence.getRecurrenceInformation(
        myEvents.get(eventId)!
      );
      if (recurrenceInfo !== undefined) {
        recurrenceSchedule.set(eventId, recurrenceInfo);
      }
    });

    const inputs: CalendarAlg.Inputs = {
      myEvents,
      myEventsList,
      myWorkingHours,
      theirEvents: new Map(),
      theirWorkingHours,
      moveableEvents,
      moveableEventTimings,
      recurrenceSchedule,
    };

    const serializedInputs = JSON.stringify(serializeInputs(inputs));
    const compressedBlob = Utilities.gzip(
      Utilities.newBlob(serializedInputs, "application/json")
    );

    const compressedInputs = Utilities.base64Encode(compressedBlob.getBytes());

    cache.put(CalendarAlg.INPUTS_CACHE_KEY, compressedInputs, 30 * 60); // Cache for 30 minutes

    const theirEventsArray = Array.from(theirEvents.entries());
    const partitionSize = Math.ceil(theirEventsArray.length / 3);
    const theirEventsPart1 = new Map(theirEventsArray.slice(0, partitionSize));
    const theirEventsPart2 = new Map(
      theirEventsArray.slice(partitionSize, partitionSize * 2)
    );
    const theirEventsPart3 = new Map(theirEventsArray.slice(partitionSize * 2));

    const serializedTheirEvents1 = JSON.stringify(
      Array.from(theirEventsPart1.entries())
    );
    const compressedBlobTheirEvents1 = Utilities.gzip(
      Utilities.newBlob(serializedTheirEvents1, "application/json")
    );

    const compressedTheirEvents1 = Utilities.base64Encode(
      compressedBlobTheirEvents1.getBytes()
    );

    cache.put(
      CalendarAlg.THEIR_EVENTS_CACHE_KEY_1,
      compressedTheirEvents1,
      30 * 60
    );

    const serializedTheirEvents2 = JSON.stringify(
      Array.from(theirEventsPart2.entries())
    );
    const compressedBlobTheirEvents2 = Utilities.gzip(
      Utilities.newBlob(serializedTheirEvents2, "application/json")
    );

    const compressedTheirEvents2 = Utilities.base64Encode(
      compressedBlobTheirEvents2.getBytes()
    );

    cache.put(
      CalendarAlg.THEIR_EVENTS_CACHE_KEY_2,
      compressedTheirEvents2,
      30 * 60
    );

    const serializedTheirEvents3 = JSON.stringify(
      Array.from(theirEventsPart3.entries())
    );
    const compressedBlobTheirEvents3 = Utilities.gzip(
      Utilities.newBlob(serializedTheirEvents3, "application/json")
    );

    const compressedTheirEvents3 = Utilities.base64Encode(
      compressedBlobTheirEvents3.getBytes()
    );

    cache.put(
      CalendarAlg.THEIR_EVENTS_CACHE_KEY_3,
      compressedTheirEvents3,
      30 * 60
    );

    Log.log("Inputs cached in four parts for 30 minutes.");

    return {
      ...inputs,
      theirEvents,
    };
  }

  function serializeInputs(inputs: CalendarAlg.Inputs) {
    return {
      ...inputs,
      myEvents: Array.from(inputs.myEvents.entries()),
      theirEvents: Array.from(inputs.theirEvents.entries()),
      theirWorkingHours: Array.from(inputs.theirWorkingHours.entries()),
      moveableEvents: Array.from(inputs.moveableEvents),
      moveableEventTimings: Array.from(inputs.moveableEventTimings.entries()),
      recurrenceSchedule: Array.from(inputs.recurrenceSchedule.entries()),
    };
  }

  function deserializeInputs(data: any): CalendarAlg.Inputs {
    return {
      ...data,
      myEvents: new Map(data.myEvents),
      theirEvents: new Map(data.theirEvents),
      theirWorkingHours: new Map(data.theirWorkingHours),
      moveableEvents: new Set(data.moveableEvents),
      moveableEventTimings: new Map(data.moveableEventTimings),
      recurrenceSchedule: new Map(data.recurrenceSchedule),
    };
  }

  export function deepCloneEventTimingsMap(
    originalMap: Map<string, CalendarCost.EventTiming>
  ): Map<string, CalendarCost.EventTiming> {
    const clonedMap = new Map<string, CalendarCost.EventTiming>();

    originalMap.forEach((value, key) => {
      const clonedValue: CalendarCost.EventTiming = {
        dayOfWeek: value.dayOfWeek,
        startTimeOfDaySeconds: value.startTimeOfDaySeconds,
        endTimeOfDaySeconds: value.endTimeOfDaySeconds,
      };

      clonedMap.set(key, clonedValue);
    });

    return clonedMap;
  }

  export function convertSecondsTimingToDate(
    secondsTiming: number,
    dayOfWeek: number,
    refDate: Date
  ): Date {
    const date = new Date(refDate);
    date.setDate(date.getDate() + (dayOfWeek - date.getDay()));
    date.setHours(0, 0, 0, 0);
    date.setSeconds(secondsTiming);

    return date;
  }

  export function formatToPacificTime(
    event: GoogleAppsScript.Calendar.Schema.Event,
    newTiming: CalendarCost.EventTiming | undefined
  ): string {
    const pacificTimeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const originalStart = new Date(event.start!.dateTime!);
    const originalEnd = new Date(event.end!.dateTime!);

    if (newTiming === undefined) {
      return (
        pacificTimeFormatter.format(originalStart) +
        " - " +
        pacificTimeFormatter.format(originalEnd)
      );
    }

    const solutionStartDate = new Date(originalStart);
    solutionStartDate.setHours(0, 0, 0, 0);
    solutionStartDate.setDate(
      solutionStartDate.getDate() + newTiming.dayOfWeek - originalStart.getDay()
    );
    solutionStartDate.setSeconds(newTiming.startTimeOfDaySeconds);

    const solutionEndDate = new Date(solutionStartDate);
    solutionEndDate.setSeconds(
      solutionStartDate.getSeconds() +
        (newTiming.endTimeOfDaySeconds - newTiming.startTimeOfDaySeconds)
    );

    return (
      pacificTimeFormatter.format(solutionStartDate) +
      " - " +
      pacificTimeFormatter.format(solutionEndDate)
    );
  }

  export function describeSolution(
    myEventsList: GoogleAppsScript.Calendar.Schema.Event[],
    myWorkingHours: WorkingHours.TimeRange,
    solution: Map<string, CalendarCost.EventTiming>
  ): void {
    const beforeCost = CalendarCost.calculateCost(
      myEventsList,
      new Map(),
      myWorkingHours
    );
    Log.logPhase("Calendar before: (cost: " + beforeCost + ")");
    let eventsToDisplay = myEventsList.filter(
      (event) => event.start?.dateTime !== undefined
    );
    eventsToDisplay.sort((a, b) => {
      return (
        new Date(a.start!.dateTime!).getTime() -
        new Date(b.start!.dateTime!).getTime()
      );
    });
    eventsToDisplay.forEach((event) => {
      Log.log(
        CalendarAlg.formatToPacificTime(event, undefined) + " " + event.summary
      );
    });

    const afterCost = CalendarCost.calculateCost(
      myEventsList,
      solution,
      myWorkingHours
    );
    Log.logPhase("Calendar after: (cost: " + afterCost + ")");
    eventsToDisplay = myEventsList.filter(
      (event) => event.start?.dateTime !== undefined
    );
    eventsToDisplay.sort((a, b) => {
      let aDate = new Date(a.start!.dateTime!).getTime();
      if (solution.has(a.id!)) {
        const timing = solution.get(a.id!)!;
        aDate = CalendarAlg.convertSecondsTimingToDate(
          timing.startTimeOfDaySeconds,
          timing.dayOfWeek,
          new Date(a.start!.dateTime!)
        ).getTime();
      }
      let bDate = new Date(b.start!.dateTime!).getTime();
      if (solution.has(b.id!)) {
        const timing = solution.get(b.id!)!;
        bDate = CalendarAlg.convertSecondsTimingToDate(
          timing.startTimeOfDaySeconds,
          timing.dayOfWeek,
          new Date(b.start!.dateTime!)
        ).getTime();
      }
      return aDate - bDate;
    });
    eventsToDisplay.forEach((event) => {
      const changed =
        CalendarAlg.formatToPacificTime(event, solution.get(event.id!)) !==
        CalendarAlg.formatToPacificTime(event, undefined);
      Log.log(
        CalendarAlg.formatToPacificTime(event, solution.get(event.id!)) +
          " " +
          event.summary +
          " " +
          event.id! +
          (changed ? " 🕰️" : "")
      );
    });
  }
}
