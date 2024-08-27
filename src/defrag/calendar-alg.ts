import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { Time } from "../checks/time";
import { CalendarCost } from "./calendar-cost";
import { WorkingHours } from "./working-hours";

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
    // TODO understand the recurrence schedule of an event
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

  export function getAlternateStartTimeOptions(
    myEventsList: GoogleAppsScript.Calendar.Schema.Event[],
    myWorkingHours: WorkingHours.TimeRange,
    theirEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>,
    theirWorkingHoursMap: Map<string, WorkingHours.TimeRange>,
    currentSolution: Map<string, CalendarCost.EventTiming>,
    event: GoogleAppsScript.Calendar.Schema.Event
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
    const possibleDays = [0, -1, 1]; // Same day, previous day, next day

    for (const dayOffset of possibleDays) {
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

        if (
          proposedStartSeconds >= myWorkingHours.startTimeSeconds &&
          proposedEndSeconds <= myWorkingHours.endTimeSeconds &&
          proposedStartSeconds >= theirWorkingHours.startTimeSeconds &&
          proposedEndSeconds <= theirWorkingHours.endTimeSeconds
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

    return {
      myEvents,
      myEventsList,
      myWorkingHours,
      theirEvents,
      theirWorkingHours,
      moveableEvents,
      moveableEventTimings,
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
    inputs: CalendarAlg.Inputs,
    solution: Map<string, CalendarCost.EventTiming>
  ): void {
    inputs.moveableEvents.forEach((eventId) => {
      const event = inputs.myEvents.get(eventId);
      if (event) {
        Log.log(`Event: ${event.summary}`);
        const originalTiming = CalendarAlg.formatToPacificTime(
          event,
          undefined
        );
        const newTiming = CalendarAlg.formatToPacificTime(
          event,
          solution.get(eventId)
        );
        if (originalTiming === newTiming) {
          Log.log(`  Timing is unchanged.`);
        } else {
          Log.log(`  Original timing: ${originalTiming}`);
          Log.log(`  New timing: ${newTiming}`);
        }
      } else {
        Log.log(`Event with ID ${eventId} not found in myEvents.`);
      }
    });
  }
}
