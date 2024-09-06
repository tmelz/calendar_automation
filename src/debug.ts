import { Orchestrator } from "./orchestrator";
import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";
import { EventUtil } from "./checks/event-util";
import { CalendarAlg, SimulatedAnnealing } from "./defrag/calendar-alg";
import { GreedyDefrag } from "./defrag/greedy-defrag";
import { WorkingHours } from "./defrag/working-hours";

// export function debugEstimateWorkingHours(email: string) {
//   const events = GetEvents.getEventsForRestOfWeek();
//   events.forEach((event) => {
//     console.log(`${event.summary}`);
//     console.log(`${event}`);
//   }
// }

// Calendar.Events?.remove("primary", event.id!, {
//   sendUpdates: "all",
// });

export function debug(): void {
  // test
  // SimulatedAnnealing.main();
  // console.log(
  //   JSON.stringify(WorkingHours.estimateWorkingHours("tmellor@block.xyz"))
  // );
  const inputs = CalendarAlg.getInputs(new Date("2024-10-06"));
  GreedyDefrag.solve(inputs);

  // const events = GetEvents.getEventsForDateRange(
  //   new Date("2024-10-06"),
  //   new Date("2024-10-13")
  // );
  // events.forEach((event) => {
  //   console.log(`${event.summary}`);
  //   console.log(`${event}`);
  // });

  // const results = [
  //   Calendar.Events?.get("primary", "tpqn2or4otb8sqb6l187gt3u0b"),
  //   Calendar.Events?.get("primary", "i34h2a19gu3u0fb9iphb1h6mdg"),
  //   Calendar.Events?.get("primary", "oi69i0nf3ii39qmi3olqj4ct9j"),
  //   Calendar.Events?.get("primary", "63jqc0ooqge8l0lrduc9ecplb8"),
  // ];
  // results.forEach((result) => {
  //   console.log(`${result?.summary}`);
  //   console.log(`${result?.recurrence}`);
  // });
}

// export function debug() {
//   const today: Date = new Date();
//   const temp: Date = new Date();
//   const first: number = temp.getDate() - temp.getDay() + 1;
//   const last: number = first + 6;
//   const sunday: Date = new Date(temp.setDate(last));

//   const timeMin = today;
//   const timeMax = sunday;
//   const calendarId = "primary";

//   const udpatedMin = new Date();
//   const thirtyMinutes = 30 * 60 * 1000;
//   udpatedMin.setTime(udpatedMin.getTime() - thirtyMinutes);

//   Log.log(
//     `🕵️ Fetching events for calendarId="${calendarId}": "${timeMin.toLocaleString()}" till "${timeMax.toLocaleString()}"`
//   );

//   const events: GoogleAppsScript.Calendar.Schema.Event[] =
//     Calendar.Events?.list(calendarId, {
//       timeMin: timeMin.toISOString(),
//       timeMax: timeMax.toISOString(),
//       singleEvents: true,
//       orderBy: "startTime",
//       maxResults: 200,
//       updatedMin: udpatedMin.toISOString(),
//     })?.items ?? [];

//   if (events.length === 0) {
//     Log.log("No events found.");
//     return [];
//   }

//   events.forEach((event) => {
//     Log.log(
//       `event: ${event.summary} (${event.start?.dateTime} - ${event.end?.dateTime})`
//     );
//   });

//   Log.log(
//     `Got ${events.length} events (note this result will be capped at ${200} for safety)`
//   );
// }

// export function debugExperimentalChecksForRestOfWeek(): void {
//   Orchestrator.checkEvents(
//     Orchestrator.experimentalChecks,
//     GetEvents.getEventsForRestOfWeek(),
//     true,
//     Orchestrator.saveEvent
//   );
// }

// export function debugRunAllChecksTillThroughEndOfNextWeekDryRun(): void {
//   Orchestrator.checkEvents(
//     Orchestrator.allChecks,
//     GetEvents.getEventsThroughEndOfNextWeek(),
//     true,
//     Orchestrator.saveEvent
//   );
// }
