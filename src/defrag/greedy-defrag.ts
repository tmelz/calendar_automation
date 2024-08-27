import { CalendarCost } from "./calendar-cost";
import { CalendarAlg } from "./calendar-alg";
import { Log } from "../checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GreedyDefrag {
  export function main(inputs: CalendarAlg.Inputs) {
    Log.log(`GreedyDefrag.main started`);

    const emptyMap = new Map();

    Log.log("Filtering non-moveable events...");
    const nonMoveableEvents = inputs.myEventsList.filter(
      (event) => !inputs.moveableEvents.has(event.id!)
    );
    Log.log(`Non-moveable events found: ${nonMoveableEvents.length}`);

    Log.log("Mapping moveable events with their time options count...");
    const moveableEventsWithTimeOptionsCount = Array.from(
      inputs.moveableEvents
    ).map((eventId) => {
      const event = inputs.myEvents.get(eventId);
      const timeOptionsCount = CalendarAlg.getAlternateStartTimeOptions(
        nonMoveableEvents,
        inputs.myWorkingHours,
        inputs.theirEvents,
        inputs.theirWorkingHours,
        emptyMap,
        event!
      ).length;

      Log.log(`Event ID: ${eventId}, Time options count: ${timeOptionsCount}`);
      return {
        event,
        timeOptionsCount,
      };
    });

    Log.log("Sorting moveable events by time options count...");
    moveableEventsWithTimeOptionsCount.sort(
      (a, b) => a.timeOptionsCount - b.timeOptionsCount
    );

    const finalizedTimings: Map<string, CalendarCost.EventTiming> = new Map();
    const finalizedEvents: GoogleAppsScript.Calendar.Schema.Event[] =
      nonMoveableEvents.slice();

    for (const { event } of moveableEventsWithTimeOptionsCount) {
      Log.log(`Processing event ID: ${event!.id}`);
      finalizedEvents.push(event!);

      Log.log("Getting alternate start time options...");
      const timeOptions = CalendarAlg.getAlternateStartTimeOptions(
        finalizedEvents,
        inputs.myWorkingHours,
        inputs.theirEvents,
        inputs.theirWorkingHours,
        finalizedTimings,
        event!
      );
      Log.log(`Time options found: ${timeOptions.length}`);

      let minCost = undefined;
      let minCostTimeOption = undefined;

      for (const timeOption of timeOptions) {
        Log.log(`Evaluating time option: ${timeOption}`);
        const temporarySolution =
          CalendarAlg.deepCloneEventTimingsMap(finalizedTimings);
        temporarySolution.set(
          event!.id!,
          CalendarAlg.convertDateToEventTiming(event!, timeOption)
        );

        const cost = CalendarCost.calculateCost(
          finalizedEvents,
          temporarySolution,
          inputs.myWorkingHours
        );
        Log.log(`Cost for time option: ${cost}`);

        if (minCost === undefined || cost < minCost) {
          minCost = cost;
          minCostTimeOption = timeOption;
          Log.log(`New minimum cost found: ${minCost}`);
        }
      }

      if (minCost === undefined) {
        Log.log(`Error: No time options found for event: ${event!.id}`);
        throw new Error("No time options found");
      }

      Log.log(
        `Choosing time option with lowest cost (${minCost}: ${minCostTimeOption})`
      );
      finalizedTimings.set(
        event!.id!,
        CalendarAlg.convertDateToEventTiming(event!, minCostTimeOption!)
      );
    }

    Log.log(
      "Initial cost: " +
        CalendarCost.calculateCost(
          inputs.myEventsList,
          inputs.moveableEventTimings,
          inputs.myWorkingHours
        )
    );

    Log.log(
      "Final cost: " +
        CalendarCost.calculateCost(
          inputs.myEventsList,
          finalizedTimings,
          inputs.myWorkingHours
        )
    );

    Log.log(
      `GreedyDefrag.main completed successfully. Finalized timings: ${JSON.stringify(finalizedTimings)}`
    );
    return finalizedTimings;
  }
}