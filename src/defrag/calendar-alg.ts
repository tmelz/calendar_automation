import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { CalendarCost } from "./calendar-cost";
import { WorkingHours } from "./working-hours";
import { EventRecurrence } from "./event-recurrence";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CalendarAlg {
  export const INPUTS_CACHE_KEY = "calendarAlgInputs_v7";
  export const THEIR_EVENTS_CACHE_KEY_1 = "calendarAlgTheirEvents_v7_1";
  export const THEIR_EVENTS_CACHE_KEY_2 = "calendarAlgTheirEvents_v7_2";
  export const THEIR_EVENTS_CACHE_KEY_3 = "calendarAlgTheirEvents_v7_3";

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
    } else if (recurrence === EventRecurrence.RecurrenceType.TWICE_A_WEEK) {
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
    Log.log("Getting alternate start time options for " + event.summary);
    const theirEmails = EventUtil.getEmailsForAllOtherAttendees(event)?.map(
      (email) => EventUtil.standardizeEmail(email)
    );
    if (theirEmails === undefined || theirEmails.length === 0) {
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

      const dayStartSeconds = Math.max(
        ...theirEmails.map(
          (email) => theirWorkingHoursMap.get(email)?.startTimeSeconds ?? 0
        ),
        myWorkingHours.startTimeSeconds
      );
      const dayStart = CalendarAlg.convertSecondsTimingToDate(
        dayStartSeconds,
        newDate.getDay(),
        newDate
      );
      const dayEndSeconds = Math.min(
        ...theirEmails.map(
          (email) => theirWorkingHoursMap.get(email)?.endTimeSeconds ?? 0
        ),
        myWorkingHours.endTimeSeconds
      );
      const dayEnd = CalendarAlg.convertSecondsTimingToDate(
        dayEndSeconds,
        newDate.getDay(),
        newDate
      );

      if (newDate.getDay() === 5) {
        dayEnd.setHours(dayEnd.getHours() - 1);
      }

      Log.log(
        "Considering times for this day between: " + dayStart + " - " + dayEnd
      );
      Log.log(
        "Max working start: " +
          dayStartSeconds +
          " ; min working end: " +
          dayEndSeconds +
          "; across all attendees of event"
      );
      Log.log(
        "Note my working hours: " +
          myWorkingHours.startTimeSeconds +
          " - " +
          myWorkingHours.endTimeSeconds
      );

      for (
        let currentStartTime = dayStart.getTime();
        currentStartTime + eventDuration <= dayEnd.getTime();
        currentStartTime += 30 * 60 * 1000
      ) {
        const proposedStart = new Date(
          currentStartTime + offsetMinutes * 60 * 1000
        );
        const proposedEnd = new Date(proposedStart.getTime() + eventDuration);
        Log.log("\tProposed start time: " + proposedStart.toISOString());

        const hasConflict = (
          theirEmail: string | undefined,
          events: GoogleAppsScript.Calendar.Schema.Event[],
          solution: Map<string, CalendarCost.EventTiming>
        ) =>
          events.some((otherEvent) => {
            if (otherEvent.id === event.id) {
              return false;
            }

            // if this current start time is the original events start time
            // AND they rsvp'd yes to the original event
            // AND the other event they haven't RSVP'd yes to yet
            // then let's say this can't be a conflict
            if (
              theirEmail !== undefined &&
              proposedStart.getTime() === originalStartDate.getTime() &&
              EventUtil.didRSVPYes(event, theirEmail) &&
              !EventUtil.didRSVPYes(otherEvent, theirEmail)
            ) {
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

                const conflict =
                  proposedStart.getTime() < oooEnd &&
                  proposedEnd.getTime() > oooStart;
                if (conflict) {
                  Log.log("\t\tConflict with OOO event: " + otherEvent.summary);
                }

                return conflict;
              }
            }

            const conflict =
              proposedStart.getTime() < otherEnd &&
              proposedEnd.getTime() > otherStart;
            if (conflict) {
              Log.log("\t\tConflict with event: " + otherEvent.summary);
            }

            return conflict;
          });

        if (hasConflict(undefined, myEventsList, currentSolution)) {
          continue;
        }

        // for each of theirEmails, check if there is a conflict with theirEvents
        const hasConflictWithAnyOfThem = theirEmails.some((theirEmail) => {
          const events = theirEvents.get(theirEmail) ?? [];
          if (hasConflict(theirEmail, events, currentSolution)) {
            return true;
          }
        });

        if (hasConflictWithAnyOfThem) {
          continue;
        }

        newStartTimeOptions.push(proposedStart);
      }
    }

    return newStartTimeOptions;
  }

  export function getInputs(refDate: Date): CalendarAlg.Inputs {
    const startDate = new Date(refDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(refDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(0, 0, 0, 0);

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
    const myWorkingHours = WorkingHours.estimateWorkingHours(
      Session.getActiveUser().getEmail()
    );

    const moveableEvents = new Set(
      Array.from(myEvents.values())
        .filter((event) => isEventEligibleForDefragSelection(event))
        .map((event) => event.id!)
    );

    const theirEvents = new Map<
      string,
      GoogleAppsScript.Calendar.Schema.Event[]
    >();
    const theirWorkingHours = new Map<string, WorkingHours.TimeRange>();

    const otherPeople = new Set<string>();
    myEventsList
      .filter((event) => moveableEvents.has(event.id!))
      .map((event) => event.attendees)
      .filter((attendees) => attendees !== undefined)
      .flatMap((attendees) => attendees!)
      // uniqe by email, pretty gross
      .filter(
        (attendee, index, self) =>
          self.findIndex((t) => t.email === attendee.email) === index
      )
      .filter((attendee) => !EventUtil.isAttendeeLikelyAnEmailList(attendee))
      .map((attendee) => attendee.email)
      .filter((email) => email !== undefined)
      .map((email) => EventUtil.standardizeEmail(email))
      .forEach((email) => otherPeople.add(email));

    const otherPeopleEvents =
      GetEvents.getEventsForDateRangeMultipleCalendarsWithErrorCatch(
        startDate,
        endDate,
        Array.from(otherPeople)
      ) ?? {};

    Object.keys(otherPeopleEvents).forEach((email: string) => {
      const events = otherPeopleEvents ? otherPeopleEvents[email] : undefined;

      if (events === undefined) {
        Log.log(
          "Error fetching events for " +
            email +
            ", perhaps they're not an employee anymore? Skipping them"
        );
        return;
      }
      theirEvents.set(
        email!,
        events.filter(
          (event) =>
            // TODO does this include out of office?
            (event.eventType === "default" &&
              event.attendees === undefined &&
              !event.summary?.toLowerCase().includes("focus time")) ||
            // consider events that they haven't declined
            // could be interesting to exclude events they havent RSVPd-Yes to
            // but would need to be smart about that, could maybe see historically
            // if they never RSVP to that event
            (event.eventType === "default" &&
              !EventUtil.didRSVPNo(event, email)) ||
            event.eventType === "outOfOffice"
        )
      );
    });

    const today = new Date();
    const lookBack = new Date(today);
    lookBack.setMonth(lookBack.getMonth() - 2);
    const otherPeopleLongRangeEvents =
      GetEvents.getEventsForDateRangeMultipleCalendarsWithErrorCatch(
        lookBack,
        today,
        Array.from(otherPeople),
        undefined,
        2500
      ) ?? {};

    Object.keys(otherPeopleLongRangeEvents).forEach((email: string) => {
      const events = otherPeopleLongRangeEvents
        ? otherPeopleLongRangeEvents[email]
        : undefined;

      Log.log("Getting their working hours");
      theirWorkingHours.set(
        email!,
        WorkingHours.estimateWorkingHours(email!, events)
      );
    });

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

    return {
      ...inputs,
      theirEvents,
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

  export function isEventEligibleForDefragSelection(
    event: GoogleAppsScript.Calendar.Schema.Event,
    allowPastEvents: boolean = false
  ): boolean {
    if (
      event.start?.dateTime === undefined ||
      event.end?.dateTime === undefined
    ) {
      return false;
    }

    if (!allowPastEvents) {
      if (new Date(event.start!.dateTime!).getTime() < new Date().getTime()) {
        return false;
      }
    }

    if (EventUtil.isOneOnOneWithMe(event)) {
      return true;
    }

    if (
      event.eventType === "default" &&
      event.attendees !== undefined &&
      event.attendees.length > 1 &&
      event.attendees.length < 10 &&
      !EventUtil.isAnAttendeeLikelyAnEmailList(event)
    ) {
      return true;
    }

    return false;
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
