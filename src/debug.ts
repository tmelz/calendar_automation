import { Orchestrator } from "./orchestrator";
import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";
import { EventUtil } from "./checks/event-util";
import { CalendarAlg, SimulatedAnnealing } from "./defrag/calendar-alg";
import { GreedyDefrag } from "./defrag/greedy-defrag";

// export function debugEstimateWorkingHoursForManyFolks() {
//   console.log("tmellor@block.xyz");
//   debugEstimateWorkingHours("tmellor@block.xyz");

//   console.log("azra@block.xyz");
//   debugEstimateWorkingHours("azra@block.xyz");

//   console.log("pablobaxter@block.xyz");
//   debugEstimateWorkingHours("pablobaxter@block.xyz");

//   console.log("inez@block.xyz");
//   debugEstimateWorkingHours("inez@block.xyz");

//   console.log("jgraves@block.xyz");
//   debugEstimateWorkingHours("jgraves@block.xyz");

//   console.log("trmonks@block.xyz");
//   debugEstimateWorkingHours("trmonks@block.xyz");
// }

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
  const inputs = CalendarAlg.getInputs(new Date("2024-10-06"));
  GreedyDefrag.main(inputs);
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
