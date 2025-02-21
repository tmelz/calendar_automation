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

export function debug() {
  // veryifyin color id  change fix for other calendars.
  const event = Calendar.Events?.get("primary", "4udjjghm949ljp1b3cchbbsoeh");
  const newStart = new Date(event!.start!.dateTime!);
  newStart.setMinutes(newStart.getMinutes() + 5);
  event!.start!.dateTime = newStart.toISOString();
  console.log(event!.summary);
  console.log(event);
  Orchestrator.saveEvent(event!, false /*changeMyCalendarOnly*/);
  
}


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
}

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
