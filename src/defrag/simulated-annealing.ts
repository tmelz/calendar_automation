import { EventUtil } from "../checks/event-util";
import { GetEvents } from "../checks/get-events";
import { Time } from "../checks/time";
import { WorkingHours } from "./working-hours";
import { CalendarCost } from "./calendar-cost";
import { Log } from "../checks/log";
import { CalendarAlg } from "./calendar-alg";

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

  export function main(): void {
    Log.log("Main");
    Log.log("Getting inputs, this will take a while");
    const inputs = CalendarAlg.getInputs();
    Log.log("Running sim, this will take a while");
    runSim(inputs);
  }

  export function runSim(
    inputs: CalendarAlg.Inputs,
    maxSteps: number = 5000,
    initialTemp: number = 2.24,
    coolingRate: number = 0.99,
    randomSeed: number = 1234
  ): Map<string, CalendarCost.EventTiming> {
    const moveableEvents = Array.from(inputs.moveableEvents);
    let currentSolution = inputs.moveableEventTimings;
    let bestSolution = currentSolution;

    let currentCost = CalendarCost.calculateCost(
      inputs.myEventsList,
      currentSolution,
      inputs.myWorkingHours
    );
    const initialCost = currentCost;
    Log.log("Initial cost: " + currentCost);
    let bestCost = currentCost;

    let temp = initialTemp;

    for (let step = 0; step < maxSteps; step++) {
      temp *= coolingRate;
      Log.log("Running sim step " + step + ", temperature: " + temp);

      inputs.moveableEvents;

      const newSolution = CalendarAlg.deepCloneEventTimingsMap(currentSolution);
      const randomEventIndex = Math.floor(
        Math.abs(Math.sin(randomSeed++) * 10000) % moveableEvents.length
      );
      const randomEvent = inputs.myEvents.get(moveableEvents[randomEventIndex]);
      Log.log("Considering a move for event: " + randomEvent?.summary);
      const altnerativeStartForEvent = chooseAlternateStartTime(
        inputs,
        newSolution,
        randomEvent!,
        randomSeed
      );
      if (altnerativeStartForEvent === undefined) {
        Log.log("No alternative start time found, skipping");
        continue;
      }
      Log.log(
        "Alternative start time found: " +
          CalendarAlg.formatToPacificTime(
            randomEvent!,
            altnerativeStartForEvent
          )
      );

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
        Log.log(
          "accepting new solution, newCost: " +
            newCost +
            " currentCost: " +
            currentCost
        );
        currentSolution = newSolution;
        currentCost = newCost;

        if (currentCost < bestCost) {
          bestSolution = currentSolution;
          bestCost = currentCost;
        }
      } else {
        Log.log(
          "rejecting new solution, newCost: " +
            newCost +
            " currentCost: " +
            currentCost
        );
      }
    }

    Log.log("Initial cost: " + initialCost);
    Log.log("Best cost: " + bestCost);
    CalendarAlg.describeSolution(inputs, bestSolution);
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
    // log delta, acceptanceProbability, randomValue
    Log.log(
      `delta: ${delta}, acceptanceProbability: ${acceptanceProbability}, randomValue: ${randomValue}`
    );

    return randomValue < acceptanceProbability;
  }

  export function chooseAlternateStartTime(
    inputs: CalendarAlg.Inputs,
    currentSolution: Map<string, CalendarCost.EventTiming>,
    event: GoogleAppsScript.Calendar.Schema.Event,
    randomSeed: number
  ): CalendarCost.EventTiming | undefined {
    const newStartTimeOptions = CalendarAlg.getAlternateStartTimeOptions(
      inputs,
      currentSolution,
      event
    );

    if (newStartTimeOptions.length > 0) {
      const randomIndex = Math.floor(
        Math.abs(Math.sin(randomSeed++) * 10000) % newStartTimeOptions.length
      );
      const newStartTime = newStartTimeOptions[randomIndex];
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

    return undefined;
  }
}
