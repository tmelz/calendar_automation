import { CalendarCost } from "./calendar-cost";
import { CalendarAlg } from "./calendar-alg";
import { Log } from "../checks/log";
import { WorkingHours } from "./working-hours";
import { EventRecurrence } from "./event-recurrence";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GreedyDefrag {
  export type Solution = {
    timings: Map<string, CalendarCost.EventTiming>;
    unplaceableEventIds: Set<string>;
  };

  export function getEventWithLeastTimeOptions(
    unplacedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    placedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    myWorkingHours: WorkingHours.TimeRange,
    theirEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>,
    theirWorkingHoursMap: Map<string, WorkingHours.TimeRange>,
    currentSolution: Map<string, CalendarCost.EventTiming>,
    recurrenceSchedule: Map<string, EventRecurrence.RecurrenceType>
  ): {
    event: GoogleAppsScript.Calendar.Schema.Event;
    timeOptions: Date[];
  } {
    const unplacedEventsWithTimeOptionsCount = Array.from(unplacedEvents).map(
      (event) => {
        const timeOptions = CalendarAlg.getAlternateStartTimeOptions(
          placedEvents,
          myWorkingHours,
          theirEvents,
          theirWorkingHoursMap,
          currentSolution,
          event!,
          recurrenceSchedule
        );

        return {
          event,
          timeOptions: timeOptions,
        };
      }
    );

    unplacedEventsWithTimeOptionsCount.sort(
      (a, b) => a.timeOptions.length - b.timeOptions.length
    );

    return unplacedEventsWithTimeOptionsCount[0];
  }

  export function solve(inputs: CalendarAlg.Inputs): GreedyDefrag.Solution {
    Log.log(`GreedyDefrag.solve started`);

    Log.log("Filtering non-moveable events...");
    const nonMoveableEvents = inputs.myEventsList.filter(
      (event) => !inputs.moveableEvents.has(event.id!)
    );
    Log.log(`Non-moveable events found: ${nonMoveableEvents.length}`);

    const finalizedTimings: Map<string, CalendarCost.EventTiming> = new Map();
    const finalizedEvents: GoogleAppsScript.Calendar.Schema.Event[] =
      nonMoveableEvents.slice();
    const unplaceableMeetings: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const moveableEvents = inputs.myEventsList.filter((event) =>
      inputs.moveableEvents.has(event.id!)
    );

    while (
      finalizedEvents.length + unplaceableMeetings.length <
      inputs.myEventsList.length
    ) {
      const { event, timeOptions } = getEventWithLeastTimeOptions(
        moveableEvents.filter(
          (event) =>
            !finalizedEvents.includes(event) &&
            !unplaceableMeetings.includes(event)
        ),
        finalizedEvents,
        inputs.myWorkingHours,
        inputs.theirEvents,
        inputs.theirWorkingHours,
        finalizedTimings,
        inputs.recurrenceSchedule
      );

      Log.log(
        "Placing event: " +
          event!.summary +
          "; it had the fewest time options for the current calendar (" +
          timeOptions.length +
          ")"
      );

      let minCost = undefined;
      let minCostTimeOption = undefined;

      for (const timeOption of timeOptions) {
        Log.log(`\tEvaluating time option: ${timeOption}`);
        const temporarySolution =
          CalendarAlg.deepCloneEventTimingsMap(finalizedTimings);
        temporarySolution.set(
          event!.id!,
          CalendarAlg.convertDateToEventTiming(event!, timeOption)
        );

        const cost = CalendarCost.calculateCost(
          [...finalizedEvents, event],
          temporarySolution,
          inputs.myWorkingHours
        );
        Log.log(`\t\tCost for time option: ${cost}`);

        if (minCost === undefined || cost < minCost) {
          minCost = cost;
          minCostTimeOption = timeOption;
          Log.log(`\tNew minimum cost found: ${minCost}`);
        }
      }

      if (minCost === undefined) {
        Log.log(
          `Error: No time options found for event: ${event!.id}, ${event?.summary}`
        );
        unplaceableMeetings.push(event!);
        continue;
      }

      Log.log(
        `Choosing time option with lowest cost (${minCost}: ${minCostTimeOption})`
      );
      finalizedTimings.set(
        event!.id!,
        CalendarAlg.convertDateToEventTiming(event!, minCostTimeOption!)
      );
      finalizedEvents.push(event!);
    }

    unplaceableMeetings.forEach((event) => {
      Log.log(`Unplaceable meeting: ${event.id}, ${event.summary}`);
    });

    Log.log(
      `GreedyDefrag.main completed successfully. Finalized timings: ${JSON.stringify(finalizedTimings)}`
    );
    CalendarAlg.describeSolution(
      inputs.myEventsList.filter(
        (event) => !unplaceableMeetings.includes(event)
      ),
      inputs.myWorkingHours,
      finalizedTimings
    );

    return {
      timings: finalizedTimings,
      unplaceableEventIds: new Set(
        unplaceableMeetings.map((event) => event.id!)
      ),
    };
  }
}
