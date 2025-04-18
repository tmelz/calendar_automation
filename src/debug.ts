import { Orchestrator } from "./orchestrator";
import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";
import { EventUtil } from "./checks/event-util";
import { CalendarAlg } from "./defrag/calendar-alg";
import { GreedyDefrag } from "./defrag/greedy-defrag";
import { WorkingHours } from "./defrag/working-hours";
import { ModifyEvent } from "./checks/modify-event";
import { TeamCalendarOOO } from "./team_calendar/team-calendar-ooo";
import { CheckColor } from "./checks/check-color";
import { TeamCalendarOncall } from "./team_calendar/team-calendar-pagerduty";
import { CheckNotes } from "./checks/check-notes";
import { CheckTypes } from "./checks/check-types";
import { Pagerduty } from "./pagerduty";

export function debug() {
  TeamCalendarOOO.syncCalendarOOO(
    new Date(),
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
    "c_230536d5accf9563d9b5e7b20becfa47df6a09c6423499e9b1c841a80bd2abfc@group.calendar.google.com",
    "mdx-ios@squareup.com",
    true // dry run
  );
}

// debugging new behavior with grouping oncall settings by calendar
// export function debug() {
//   const now = new Date();
//   const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

// const oncalls = Pagerduty.listOnCalls(
//   now.toDateString(),
//   nextWeek.toDateString(),
//   ["PSQSM9I", "P2PQIFR"]
// );
// console.log(oncalls?.length);
// oncalls?.forEach((oncall) => {
//   console.log(
//     `${oncall.user.name}, ${oncall.user.email}, ${oncall.schedule.summary}, ${oncall.start}, ${oncall.end}`
//   );
// });

// const oncalls1 = Pagerduty.listOnCalls(
//   now.toDateString(),
//   nextWeek.toDateString(),
//   ["PSQSM9I"]
// );
// console.log(oncalls1?.length);
// oncalls1?.forEach((oncall) => {
//   console.log(
//     `${oncall.user.name}, ${oncall.user.email}, ${oncall.schedule.summary}, ${oncall.start}, ${oncall.end}`
//   );
// });

// const oncalls2 = Pagerduty.listOnCalls(
//   now.toDateString(),
//   nextWeek.toDateString(),
//   ["PSQSM9I"]
// );
// console.log(oncalls2?.length);
// oncalls2?.forEach((oncall) => {
//   console.log(
//     `${oncall.user.name}, ${oncall.user.email}, ${oncall.schedule.summary}, ${oncall.start}, ${oncall.end}`
//   );
// });

// TeamCalendarOncall.syncCalendarOncall(
//   now,
//   nextWeek,
//   // tmellor test
//   "c_uoaafg58e3m97rp6767blj7pi0@group.calendar.google.com",
//   ["PSQSM9I", "P2PQIFR"],
//   true /*dry run*/
// );

// TeamCalendarOncall.syncCalendarOncalls(
//   now,
//   nextWeek,
//   [
//     {
//       calendarId: "c_uoaafg58e3m97rp6767blj7pi0@group.calendar.google.com",
//       scheduleId: "PSQSM9I",
//     },
//     {
//       calendarId: "c_uoaafg58e3m97rp6767blj7pi0@group.calendar.google.com",
//       scheduleId: "P2PQIFR",
//     },
//   ],
//   true /*dry run*/
// );
// }

// debug pagerduty oncall auth fail
// export function debug() {
// const oncalls = Pagerduty.listOnCalls(
//   new Date().toDateString(),
//   new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000).toDateString(),
//   ["P1DXQ9G"]
// );
// console.log(oncalls);
// }

// debug getNameByEmail raising resource not found error despite being valid employee
// export function debug() {
//   console.log(TeamCalendarOOO.getNameByEmail("___@squareup.com"));
// }

// export function debug() {
//   // const results = CheckNotes.createNotesMapping(new Date());
//   // results?.forEach(
//   //   (value: GoogleAppsScript.Calendar.Schema.EventAttachment, key: string) => {
//   //     console.log(`${key}: ${value.title}`);
//   //   }
//   // );

//   const event = Calendar.Events?.get("primary", "16s58k98q35erlt14ahp00l4mh");
//   const modificationType = CheckNotes.checkShouldModifyEvent(event!);
//   Log.log(
//     `should modify: ${modificationType}, ${modificationType === CheckTypes.ModificationType.YES_ADD_NOTES}`
//   );
//   Log.log(CheckNotes.modifyEventLocally(event!, modificationType!)[0]);

//   Orchestrator.saveEvent(event!, false);
// }

// experiment with attaching notes docs to events
// export function debug() {
//   // event 1 with notes doc
//   // 4775g5i0kb9h6mp3css8vp8lql
//   // event 2 with none
//   // 5dplf7tfngdlu8m5e20k83gh05

//   const event = Calendar.Events?.get("primary", "4775g5i0kb9h6mp3css8vp8lql");
//   console.log(event!.attachments);
//   console.log(event);

//   const event2 = Calendar.Events?.get("primary", "5dplf7tfngdlu8m5e20k83gh05");
//   console.log(event2!.attachments);
//   console.log(event2);
//   event2!.attachments = [event?.attachments[0]];
//   // lol what you can set the event preview title to whatever you want?
//   // that's so odd
//   event2!.attachments![0].title = "💩";
//   console.log(event2!.attachments);
//   // event2!.attachments![0].title = "💩";

//   Orchestrator.saveEvent(event2!, false /*changeMyCalendarOnly*/);
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

// debugging team calendar OOO issue
// export function debug() {
//   TeamCalendarOOO.syncCalendarOOO(
//     new Date(),
//     new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000),
//     "c_ae6f08804802c0642135e8e3280a2293ea73eb3e8b434424006afb947e767cfc@group.calendar.google.com",
//     "mdx-android@squareup.com",
//     true // dry run
//   );
// }

// try out UrlFetchApp.fetchAll
// trying to optimize defrag perf
// export function debug() {
//     const now = new Date();
//   const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

//   // array that repeats "primary" 100 times
//   const reqs = Array(100).fill("primary");
//   const result = GetEvents.getEventsForDateRangeMultipleCalendarsWithErrorCatch(now, tomorrow, reqs);
//   if (result === undefined) {
//     Log.log("No events found.");
//     return;
//   }

//   console.log(result);
//   const events = result["primary"];
//   events.forEach((event) => {
//     console.log(`${event.summary}`);
//     console.log(`${event}`);
//   });
// }

// export function debug() {
//   // veryifyin color id  change fix for other calendars.
//   const event = Calendar.Events?.get("primary", "4udjjghm949ljp1b3cchbbsoeh");
//   const newStart = new Date(event!.start!.dateTime!);
//   newStart.setMinutes(newStart.getMinutes() + 5);
//   event!.start!.dateTime = newStart.toISOString();
//   console.log(event!.summary);
//   console.log(event);
//   Orchestrator.saveEvent(event!, false /*changeMyCalendarOnly*/);

// }

// export function debug() {
//   const now = new Date();
//   const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
//   TeamCalendarOncall.syncCalendarOncall(
//     now,
//     nextWeek,
//     // test calendar
//     "c_dbf46adba7f1d6fc383bbeaaf7d50723e6bea3901446fb11b02f9d5751219f6f@group.calendar.google.com",
//     // example pagerduty
//     "PGPS6UF",
//     true /*dry run*/
//   );

// Log.log(
//   JSON.stringify(WorkingHours.estimateWorkingHours("tmellor@block.xyz"))
// );

// const events = GetEvents.getEventsForDateRange(new Date(), new Date((new Date()).getTime() + 7 * 24 * 60 * 60 * 1000));
// events.forEach((event) => {
//   Log.log(`${event.summary}`);
//   Log.log(CheckColor.getCategoryForEvent(event) ?? "undefined");
//   Log.log(`\t${event}`);

// });

// const tmellorTestCal =
//   "c_dbf46adba7f1d6fc383bbeaaf7d50723e6bea3901446fb11b02f9d5751219f6f@group.calendar.google.com";
// // const androidTeamCal =
// //   "c_ae6f08804802c0642135e8e3280a2293ea73eb3e8b434424006afb947e767cfc@group.calendar.google.com";

// const now = new Date();
// const nowYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
// const twoWeeksFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
// TeamCalendarOOO.syncCalendarOOO(
//   nowYesterday,
//   twoWeeksFromNow,
//   tmellorTestCal,
//   "mdx-ios@squareup.com",
//   // "mdx-android@squareup.com",
//   true // is dry run
// );
// }

// export function debugListCalEvents() {
//   const now = new Date();
//   const nowYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//   const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

//   const events = Calendar.Events?.list(
//     "c_dbf46adba7f1d6fc383bbeaaf7d50723e6bea3901446fb11b02f9d5751219f6f@group.calendar.google.com",
//     {
//       timeMin: nowYesterday.toISOString(),
//       timeMax: oneWeekFromNow.toISOString(),
//       singleEvents: true,
//       orderBy: "startTime",
//       maxResults: 10,
//     }
//   );
//   events?.items?.forEach((event) => {
//     console.log(
//       `${event.summary}, ${event.id}, ${JSON.stringify(event.start)}, ${JSON.stringify(event.end)}`
//     );
//   });
// }

// const now = new Date();
// const oneHourInFuture = new Date(now.getTime() + 60 * 60 * 1000);
// const calendarId = "tmellor@block.xyz";
// // const calendarId = "c_dbf46adba7f1d6fc383bbeaaf7d50723e6bea3901446fb11b02f9d5751219f6f@group.calendar.google.com";

// let events = Calendar.Events?.list(calendarId, {
//   timeMin: now.toISOString(),
//   timeMax: oneHourInFuture.toISOString(),
//   singleEvents: true,
//   orderBy: "startTime",
//   maxResults: 10,
// });
// events?.items?.forEach((event) => {
//   console.log(
//     `${event.summary}, ${event.id}, ${event.colorId}, ${event.start?.dateTime}`
//   );
//   console.log(`${JSON.stringify(event)}`);
//   if (event.id === "4tj61a1r9puiipoc0899l52gno") {
//     console.log("modifying event");
//     const eventStart = new Date(event.start!.dateTime!);
//     // add 15 minutes to start
//     eventStart.setMinutes(eventStart.getMinutes() + 3);
//     console.log(event.start!.dateTime);
//     console.log(event.end!.dateTime);
//     event.start!.dateTime = eventStart.toISOString();
//     console.log(event.start!.dateTime);
//     console.log(event.end!.dateTime);

// saveEvent(event);

// console.log("modifying event locally with manual sequence increment");
// // console.log("current sequence: " + event.sequence);
// // event.sequence = event.sequence! + 1;
// // console.log("bumped sequence: " + event.sequence);
// event.colorId = "9";
// saveEvent(event, true);
//   }
// });

// events = Calendar.Events?.list(calendarId, {
//   timeMin: now.toISOString(),
//   timeMax: oneHourInFuture.toISOString(),
//   singleEvents: true,
//   orderBy: "startTime",
//   maxResults: 10,
// });
// events?.items?.forEach((event) => {
//   console.log(
//     `${event.summary}, ${event.id}, ${event.colorId}, ${event.start?.dateTime}`
//   );
//   console.log(`${JSON.stringify(event)}`);
//   if (event.id === "4tj61a1r9puiipoc0899l52gno") {
//     console.log("modifying event locally with manual sequence increment");
//     // console.log("current sequence: " + event.sequence);
//     // event.sequence = event.sequence! + 1;
//     // console.log("bumped sequence: " + event.sequence);
//     event.colorId = "11";
//     saveEvent(event, true);
//   }
// });

// events = Calendar.Events?.list(calendarId, {
//   timeMin: now.toISOString(),
//   timeMax: oneHourInFuture.toISOString(),
//   singleEvents: true,
//   orderBy: "startTime",
//   maxResults: 10,
// });
// events?.items?.forEach((event) => {
//   console.log(
//     `${event.summary}, ${event.id}, ${event.colorId}, ${event.start?.dateTime}`
//   );
//   console.log(`${JSON.stringify(event)}`);
//   if (event.id === "2ca5nsak4reg77ejfvhov1epfe") {
//     console.log("modifying event");
//     event.colorId = "5";
//     saveEvent(event, true);
//   }
// });
// }

export function saveEvent(
  event: GoogleAppsScript.Calendar.Schema.Event,
  changeMyCalendarOnly: boolean = false
): boolean {
  Log.log(`💾 Saving event, "${event.summary}"`);
  // My event, I can modify
  if (changeMyCalendarOnly || EventUtil.amITheOrganizer(event)) {
    const organizer = "tmellor@block.xyz";
    if (changeMyCalendarOnly) {
      Log.log(
        `Forcing applying changes locally to my calendar only "${organizer}"`
      );
    } else {
      Log.log(
        `👋 I am organizer, saving changes using calendar "${organizer}"`
      );
    }
    Calendar.Events?.update(event, organizer, event.id!, {
      sendUpdates: "none",
    });
    return true;

    // Not my event, but I should be able to modify it directly on the organizers calendar
    // THIS REQUIRES their calendar is visible to you, at least with free/busy, otherwise the
    // API call will fail, even if you have modify access :( it's a weird API bug
    // https://issuetracker.google.com/issues/204791550
  } else if (event.guestsCanModify === true) {
    Log.log(
      `👎 I am not organizer, attempting to save changes on calendar, "${event.organizer!.email!}"`
    );
    try {
      Calendar.Events?.update(event, event.organizer!.email!, event.id!, {
        sendUpdates: "none",
      });
      return true;
    } catch (error: any) {
      // GoogleJsonResponseException: API call to calendar.events.update failed with error: Not Found
      Log.log(
        `🚨 Error saving to calendar, "${event.organizer!.email!}, most likely we don't have visibility of their calendar and get a not found error. error: ${error.message}"`
      );
      return false;
    }
    // Not my event, and can't modify it on the organizers calendar, SOL
  } else {
    Log.log(
      `🚨  I am not organizer and don't have modification rights, cannot save "${event.organizer!.email!}"`
    );
    return false;
  }
}

// export function debug(): void {
//   // test
//   // SimulatedAnnealing.main();
//   // console.log(
//   //   JSON.stringify(WorkingHours.estimateWorkingHours("tmellor@block.xyz"))
//   // );
//   const inputs = CalendarAlg.getInputs(new Date("2024-10-06"));
//   GreedyDefrag.solve(inputs);

//   // const events = GetEvents.getEventsForDateRange(
//   //   new Date("2024-10-06"),
//   //   new Date("2024-10-13")
//   // );
//   // events.forEach((event) => {
//   //   console.log(`${event.summary}`);
//   //   console.log(`${event}`);
//   // });

//   // const results = [
//   //   Calendar.Events?.get("primary", "tpqn2or4otb8sqb6l187gt3u0b"),
//   //   Calendar.Events?.get("primary", "i34h2a19gu3u0fb9iphb1h6mdg"),
//   //   Calendar.Events?.get("primary", "oi69i0nf3ii39qmi3olqj4ct9j"),
//   //   Calendar.Events?.get("primary", "63jqc0ooqge8l0lrduc9ecplb8"),
//   // ];
//   // results.forEach((result) => {
//   //   console.log(`${result?.summary}`);
//   //   console.log(`${result?.recurrence}`);
//   // });
// }

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
