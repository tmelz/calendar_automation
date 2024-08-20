import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Time } from "../checks/time";
import { WorkingHours } from "./working-hours";
import { CalendarCost } from "./calendar-cost";

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
    myEvents: GoogleAppsScript.Calendar.Schema.Event[];
    myWorkingHours: WorkingHours.TimeRange;
    theirEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>;
    theirWorkingHours: Map<string, WorkingHours.TimeRange>;
    moveableEvents: Set<string>;
    // TODO understand the recurrence schedule of an event
  };

  export function runSim(
    inputs: Inputs,
    maxSteps: number,
    initialTemp: number,
    coolingRate: number,
    randomSeed: number
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    // TODO fix this with respect to cloning / etc
    // Make solution instead {cal event id : {start, end}}
    // then easier to do this whole thing
    const moveableEvents = Array.from(inputs.moveableEvents);
    const currentSolution = inputs.myEvents.slice();
    let bestSolution = inputs.myEvents.slice();

    let currentCost = CalendarCost.calculateCost(
      currentSolution,
      inputs.myWorkingHours
    );
    let bestCost = currentCost;

    let temp = initialTemp;

    for (let step = 0; step < maxSteps; step++) {
      temp *= 1 - coolingRate;

      inputs.moveableEvents;

      const newSolution = currentSolution.slice();
      const randomEventIndex = Math.floor(
        (Math.sin(randomSeed++) * 10000) % moveableEvents.length
      );
      const randomEvent = inputs.myEvents.find(
        (event) => event.id === moveableEvents[randomEventIndex]
      );

      if (chooseAlternateStartTime(inputs, randomEvent!, randomSeed)) {
        const newCost = CalendarCost.calculateCost(
          newSolution,
          inputs.myWorkingHours
        );

        if (accept(newCost, currentCost, temp)) {
          currentSolution[randomEventIndex] = randomEvent;
          currentCost = newCost;

          if (currentCost < bestCost) {
            bestSolution = currentSolution.slice();
            bestCost = currentCost;
          }
        }
      }
    }

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
  ): boolean {
    const theirEmail = EventUtil.getEmailForOtherAttendee(event);
    if (theirEmail === undefined) {
      return false;
    }

    const myWorkingHours = inputs.myWorkingHours;
    const theirWorkingHours = inputs.theirWorkingHours.get(theirEmail);
    if (!theirWorkingHours) {
      return false;
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
      dayStart.setHours(Math.floor(myWorkingHours.startTime / 3600), 0, 0, 0);

      const dayEnd = new Date(newDate);
      dayEnd.setHours(Math.floor(myWorkingHours.endTime / 3600), 0, 0, 0);

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

        const proposedStartSeconds = WorkingHours.getTimeOfDay(proposedStart);
        const proposedEndSeconds = WorkingHours.getTimeOfDay(proposedEnd);

        if (
          proposedStartSeconds >= myWorkingHours.startTime &&
          proposedEndSeconds <= myWorkingHours.endTime &&
          proposedStartSeconds >= theirWorkingHours.startTime &&
          proposedEndSeconds <= theirWorkingHours.endTime
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
            !hasConflict(inputs.myEvents) &&
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

      event.start!.dateTime = newStartTime.toISOString();
      event.end!.dateTime = new Date(
        newStartTime.getTime() + eventDuration
      ).toISOString();

      return true;
    }

    return false;
  }

  export function getInputs(): SimulatedAnnealing.Inputs {
    const sunday: Date = Time.getSundayOfCurrentWeek();
    sunday.setHours(24, 0, 0, 0);
    const followingSunday: Date = Time.getSundayOfCurrentWeek();
    followingSunday.setDate(followingSunday.getDate() + 7);
    followingSunday.setHours(24, 0, 0, 0);

    const myEvents = GetEvents.getEventsForDateRange(sunday, followingSunday);
    const myWorkingHours = WorkingHours.estimateWorkingHours("primary");
    const theirEvents = new Map<
      string,
      GoogleAppsScript.Calendar.Schema.Event[]
    >();
    const theirWorkingHours = new Map<string, WorkingHours.TimeRange>();

    const otherPeople = new Set<string>();
    myEvents
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

    return {
      myEvents,
      myWorkingHours,
      theirEvents,
      theirWorkingHours,
      moveableEvents: new Set(
        myEvents
          .filter((event) => EventUtil.isOneOnOneWithMe(event))
          .map((event) => event.id!)
      ),
    };
  }
}
