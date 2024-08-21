import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Time } from "../checks/time";
import { WorkingHours } from "./working-hours";
import { CalendarCost } from "./calendar-cost";
import { Log } from "../checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SimulatedAnnealing {
  // set initial temp
  // calculate initial cal cost
  // for steps
  //   increase temp
  //   pick random calendar neighbor
  //   calculate neighor cost
  //   if accept(neighbor cost, current cost, temp)
  //    accept neighbor as current

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

  export function main(): void {
    Log.log("Getting inputs, this will take a while");
    const inputs = getInputs();
    Log.log("Running sim, this will take a while");
    runSim(inputs);
  }

  export function runSim(
    inputs: Inputs,
    maxSteps: number = 100,
    initialTemp: number = 2.24,
    coolingRate: number = 0.99,
    randomSeed: number = 1234
  ): Map<string, CalendarCost.EventTiming> {
    // TODO fix this with respect to cloning / etc
    // Make solution instead {cal event id : {start, end}}
    // then easier to do this whole thing
    const moveableEvents = Array.from(inputs.moveableEvents);
    let currentSolution = inputs.moveableEventTimings;
    let bestSolution = currentSolution;

    let currentCost = CalendarCost.calculateCost(
      inputs.myEventsList,
      currentSolution,
      inputs.myWorkingHours
    );
    let bestCost = currentCost;

    let temp = initialTemp;

    for (let step = 0; step < maxSteps; step++) {
      Log.log("Running sim step " + step);
      temp *= 1 - coolingRate;

      inputs.moveableEvents;

      const newSolution = deepCloneEventTimingsMap(currentSolution);
      const randomEventIndex = Math.floor(
        (Math.sin(randomSeed++) * 10000) % moveableEvents.length
      );
      const randomEvent = inputs.myEvents.get(moveableEvents[randomEventIndex]);
      const altnerativeStartForEvent = chooseAlternateStartTime(
        inputs,
        randomEvent!,
        randomSeed
      );
      if (altnerativeStartForEvent === undefined) {
        continue;
      }

      newSolution.set(
        moveableEvents[randomEventIndex],
        altnerativeStartForEvent
      );
      const newCost = CalendarCost.calculateCost(
        inputs.myEventsList,
        newSolution,
        inputs.myWorkingHours
      );

      if (accept(newCost, currentCost, temp)) {
        currentSolution = newSolution;
        currentCost = newCost;

        if (currentCost < bestCost) {
          bestSolution = currentSolution;
          bestCost = currentCost;
        }
      }
    }

    SimulatedAnnealing.describeSolution(inputs, bestSolution);
    return bestSolution;
  }

  export function accept(
    newCost: number,
    currentCost: number,
    temp: number
  ): boolean {
    if (newCost < currentCost) {
      return true;
    }

    const delta = newCost - currentCost;
    const acceptanceProbability = Math.exp(-delta / temp);
    const randomValue = Math.random();

    return randomValue < acceptanceProbability;
  }

  export function chooseAlternateStartTime(
    inputs: Inputs,
    event: GoogleAppsScript.Calendar.Schema.Event,
    randomSeed: number
  ): CalendarCost.EventTiming | undefined {
    const theirEmail = EventUtil.getEmailForOtherAttendee(event);
    if (theirEmail === undefined) {
      return undefined;
    }

    const myWorkingHours = inputs.myWorkingHours;
    const theirWorkingHours = inputs.theirWorkingHours.get(theirEmail);
    if (!theirWorkingHours) {
      return undefined;
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
            events: GoogleAppsScript.Calendar.Schema.Event[]
          ) =>
            events.some((otherEvent) => {
              if (otherEvent.id === event.id) {
                return false;
              }

              // Check for all-day OOO events only
              if (otherEvent.start?.date && otherEvent.end?.date) {
                const isOOOEvent =
                  otherEvent.eventType === "outOfOffice" ||
                  otherEvent.summary === "OOO- Automated by Workday";

                if (isOOOEvent) {
                  const otherStart = new Date(
                    otherEvent.start!.date!
                  ).getTime();
                  const otherEnd =
                    new Date(otherEvent.end!.date!).getTime() +
                    24 * 60 * 60 * 1000; // All-day event lasts the entire day

                  return (
                    proposedStart.getTime() < otherEnd &&
                    proposedEnd.getTime() > otherStart
                  );
                }
              } else {
                const otherStart = new Date(
                  otherEvent.start!.dateTime!
                ).getTime();
                const otherEnd = new Date(otherEvent.end!.dateTime!).getTime();

                return (
                  proposedStart.getTime() < otherEnd &&
                  proposedEnd.getTime() > otherStart
                );
              }

              return false;
            });

          if (
            !hasConflict(inputs.myEventsList) &&
            !hasConflict(inputs.theirEvents.get(theirEmail)!)
          ) {
            newStartTimeOptions.push(proposedStart);
          }
        }
      }
    }

    if (newStartTimeOptions.length > 0) {
      const randomIndex = Math.floor(
        (Math.sin(randomSeed++) * 10000) % newStartTimeOptions.length
      );
      const newStartTime = newStartTimeOptions[randomIndex];

      return {
        dayOfWeek: newStartTime.getDay(),
        startTimeOfDaySeconds: WorkingHours.getTimeOfDaySeconds(newStartTime),
        endTimeOfDaySeconds:
          WorkingHours.getTimeOfDaySeconds(newStartTime) + eventDuration / 1000, // convert milliseconds to seconds
      };
    }

    return undefined;
  }

  export function getInputs(): SimulatedAnnealing.Inputs {
    const sunday: Date = Time.getSundayOfCurrentWeek();
    sunday.setHours(24, 0, 0, 0);
    const followingSunday: Date = Time.getSundayOfCurrentWeek();
    followingSunday.setDate(followingSunday.getDate() + 7);
    followingSunday.setHours(24, 0, 0, 0);

    // Retrieve events and convert to a Map with event IDs as keys
    const myEventsList = GetEvents.getEventsForDateRange(
      sunday,
      followingSunday
    );
    const myEvents = new Map<string, GoogleAppsScript.Calendar.Schema.Event>();

    myEventsList.forEach((event) => {
      myEvents.set(event.id!, event);
    });

    const myWorkingHours = WorkingHours.estimateWorkingHours("primary");
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
        theirEvents.set(
          email!,
          GetEvents.getEventsForDateRangeCustomCalendar(
            sunday,
            followingSunday,
            email!
          )
        );
        otherPeople.add(email);

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
      const startTime = new Date(event.start!.dateTime!);
      const endTime = new Date(event.end!.dateTime!);
      const dayOfWeek = startTime.getDay();
      const startTimeOfDay = startTime.getHours() * 60 + startTime.getMinutes(); // time in minutes from start of day
      const endTimeOfDay = endTime.getHours() * 60 + endTime.getMinutes(); // time in minutes from start of day

      if (moveableEvents.has(event.id!)) {
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

  export function describeSolution(
    inputs: SimulatedAnnealing.Inputs,
    solution: Map<string, CalendarCost.EventTiming>
  ): void {
    inputs.moveableEvents.forEach((eventId) => {
      const event = inputs.myEvents.get(eventId);
      if (event) {
        const originalStart = new Date(event.start!.dateTime!);
        const originalEnd = new Date(event.end!.dateTime!);
        const solutionTiming = solution.get(eventId);

        console.log(`Event: ${event.summary}`);
        console.log(`  Original Start: ${originalStart.toISOString()}`);
        console.log(`  Original End: ${originalEnd.toISOString()}`);

        if (solutionTiming) {
          const solutionStartDate = new Date(originalStart);
          solutionStartDate.setHours(0, 0, 0, 0); // Reset to midnight
          solutionStartDate.setDate(
            solutionStartDate.getDate() +
              solutionTiming.dayOfWeek -
              originalStart.getDay()
          );
          solutionStartDate.setSeconds(solutionTiming.startTimeOfDaySeconds);

          const solutionEndDate = new Date(solutionStartDate);
          solutionEndDate.setSeconds(
            solutionStartDate.getSeconds() +
              (solutionTiming.endTimeOfDaySeconds -
                solutionTiming.startTimeOfDaySeconds)
          );

          console.log(`  New Start: ${solutionStartDate.toISOString()}`);
          console.log(`  New End: ${solutionEndDate.toISOString()}`);
        } else {
          console.log(`  No change in timing for this event.`);
        }
      } else {
        console.log(`Event with ID ${eventId} not found in myEvents.`);
      }
    });
  }
}
