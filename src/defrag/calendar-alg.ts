import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { Time } from "../checks/time";
import { CalendarCost } from "./calendar-cost";
import { WorkingHours } from "./working-hours";
import { EventRecurrence } from "./event-recurrence";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CalendarAlg {
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

  // how much should we allow a particular meeting to shift
  // throughout the week?
  export function getAllowedDayDeltas(
    recurrence: EventRecurrence.RecurrenceType | undefined,
    eventDayOfWeek: number
  ): number[] {
    let possibleDayDeltas: number[] = [];
    if (
      recurrence === undefined ||
      recurrence === EventRecurrence.RecurrenceType.DAILY
    ) {
      // undefined means it's an adhoc event, could be time sensitive to keep same day
      possibleDayDeltas = [0];
    } else if (recurrence === EventRecurrence.RecurrenceType.WEEKLY) {
      // weekly event, ok to move a bit but not too much
      possibleDayDeltas = [0, -1, 1];
      // Allow moves Monday ==> Wednesday since Tues is no meeting day
      if (eventDayOfWeek === 1) {
        possibleDayDeltas.push(2);
      }
    } else if (
      recurrence === EventRecurrence.RecurrenceType.EVERY_TWO_WEEKS ||
      recurrence === EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS
    ) {
      possibleDayDeltas = [0];
      //// Allow moving anyday Monday --> Friday since these events are less common
      // all moves to all days before this day of week
      for (let i = 1; i <= eventDayOfWeek - 1; i++) {
        possibleDayDeltas.push(-1 * i);
      }
      // allow moves to all days after
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
      // if newDate is on a Friday, set dayEnd one hour earlier
      if (newDate.getDay() === 5) {
        dayEnd.setHours(dayEnd.getHours() - 1);
      }

      for (
        let currentStartTime = dayStart.getTime();
        currentStartTime + eventDuration <= dayEnd.getTime();
        currentStartTime += 30 * 60 * 1000
      ) {
        // 30-minute increments

        const proposedStart = new Date(
          currentStartTime + offsetMinutes * 60 * 1000
        );
        const proposedEnd = new Date(proposedStart.getTime() + eventDuration);

        // if (proposedStart.getTime() === originalStartDate.getTime()) {
        //   continue;
        // }

        const proposedStartSeconds =
          WorkingHours.getTimeOfDaySeconds(proposedStart);
        const proposedEndSeconds =
          WorkingHours.getTimeOfDaySeconds(proposedEnd);

        // On Friday expect folks prefer to end meetings one hour earlier than normal
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
                    // Create a new date based on the event's day of the week
                    const startDate = new Date(newDate);
                    const dayDifference =
                      eventTiming.dayOfWeek - startDate.getDay();
                    startDate.setDate(startDate.getDate() + dayDifference);
                    // necessary, weird Date behavior o/w
                    startDate.setHours(0, 0, 0, 0);
                    startDate.setSeconds(eventTiming.startTimeOfDaySeconds);
                    return startDate.getTime();
                  })()
                : new Date(otherEvent.start!.dateTime!).getTime();

              const otherEnd = eventTiming
                ? (() => {
                    // Create a new date based on the event's day of the week
                    const endDate = new Date(newDate);
                    const dayDifference =
                      eventTiming.dayOfWeek - endDate.getDay();
                    endDate.setDate(endDate.getDate() + dayDifference);
                    // necessary, weird Date behavior o/w
                    endDate.setHours(0, 0, 0, 0);
                    endDate.setSeconds(eventTiming.endTimeOfDaySeconds);
                    return endDate.getTime();
                  })()
                : new Date(otherEvent.end!.dateTime!).getTime();

              // Check for all-day OOO events only
              if (otherEvent.start?.date && otherEvent.end?.date) {
                const isOOOEvent =
                  otherEvent.eventType === "outOfOffice" ||
                  otherEvent.summary === "OOO- Automated by Workday";

                if (isOOOEvent) {
                  const oooStart = new Date(otherEvent.start!.date!).getTime();
                  const oooEnd =
                    new Date(otherEvent.end!.date!).getTime() +
                    24 * 60 * 60 * 1000; // All-day event lasts the entire day

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
    // const sunday: Date = Time.getSundayOfCurrentWeek();
    // sunday.setHours(24, 0, 0, 0);
    // const followingSunday: Date = Time.getSundayOfCurrentWeek();
    // followingSunday.setDate(followingSunday.getDate() + 7);
    // followingSunday.setHours(24, 0, 0, 0);

    const startDate = refDate;
    startDate.setHours(24, 0, 0, 0);
    const endDate = new Date(refDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(24, 0, 0, 0);

    Log.log("getting next weeks events");
    // Retrieve events and convert to a Map with event IDs as keys
    const myEventsList = GetEvents.getEventsForDateRange(
      startDate,
      endDate
      // TODO inline these filter checks into somewhere smarter
    ).filter(
      (event) => !EventUtil.didIRSVPNo(event) && event.eventType !== "focusTime"
    );
    const myEvents = new Map<string, GoogleAppsScript.Calendar.Schema.Event>();

    myEventsList.forEach((event) => {
      myEvents.set(event.id!, event);
    });

    Log.log("getting my working hours");
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
        Log.log("getting their events next week");
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

        Log.log("getting their working hours");
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

    // Populate eventTimings
    myEvents.forEach((event) => {
      if (moveableEvents.has(event.id!)) {
        const startTime = new Date(event.start!.dateTime!);
        const endTime = new Date(event.end!.dateTime!);
        const dayOfWeek = startTime.getDay();
        const startTimeOfDay =
          startTime.getHours() * 60 * 60 + startTime.getMinutes() * 60; // time in minutes from start of day
        const endTimeOfDay =
          endTime.getHours() * 60 * 60 + endTime.getMinutes() * 60; // time in minutes from start of day

        moveableEventTimings.set(event.id!, {
          dayOfWeek,
          startTimeOfDaySeconds: startTimeOfDay,
          endTimeOfDaySeconds: endTimeOfDay,
        });
      }
    });

    const recurrenceSchedule = new Map<
      string,
      EventRecurrence.RecurrenceType
    >();
    moveableEvents.forEach((eventId) => {
      const recurenceInfo = EventRecurrence.getRecurrenceInformation(
        myEvents.get(eventId)!
      );
      if (recurenceInfo !== undefined) {
        recurrenceSchedule.set(eventId, recurenceInfo);
      }
    });

    return {
      myEvents,
      myEventsList,
      myWorkingHours,
      theirEvents,
      theirWorkingHours,
      moveableEvents,
      moveableEventTimings,
      recurrenceSchedule,
    };
  }

  export function deepCloneEventTimingsMap(
    originalMap: Map<string, CalendarCost.EventTiming>
  ): Map<string, CalendarCost.EventTiming> {
    const clonedMap = new Map<string, CalendarCost.EventTiming>();

    originalMap.forEach((value, key) => {
      // Create a deep clone of the EventTiming object
      const clonedValue: CalendarCost.EventTiming = {
        dayOfWeek: value.dayOfWeek,
        startTimeOfDaySeconds: value.startTimeOfDaySeconds,
        endTimeOfDaySeconds: value.endTimeOfDaySeconds,
      };

      // Add the cloned key-value pair to the new Map
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
    solutionStartDate.setHours(0, 0, 0, 0); // Reset to midnight
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
    // sort eventsToDisplay based on new Date(event.start?.dateTime).getTime()
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
    // sort eventsToDisplay based on new Date(event.start?.dateTime).getTime()
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
