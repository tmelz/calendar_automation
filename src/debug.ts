import { Orchestrator } from "./orchestrator";
import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";

export function debug() {
  const today: Date = new Date();
  const temp: Date = new Date();
  const first: number = temp.getDate() - temp.getDay() + 1;
  const last: number = first + 6;
  const sunday: Date = new Date(temp.setDate(last));

  const timeMin = today;
  const timeMax = sunday;
  const calendarId = "primary";

  const udpatedMin = new Date();
  const thirtyMinutes = 30 * 60 * 1000;
  udpatedMin.setTime(udpatedMin.getTime() - thirtyMinutes);

  Log.log(
    `🕵️ Fetching events for calendarId="${calendarId}": "${timeMin.toLocaleString()}" till "${timeMax.toLocaleString()}"`
  );

  const events: GoogleAppsScript.Calendar.Schema.Event[] =
    Calendar.Events?.list(calendarId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 200,
      updatedMin: udpatedMin.toISOString(),
    })?.items ?? [];

  if (events.length === 0) {
    Log.log("No events found.");
    return [];
  }

  events.forEach((event) => {
    Log.log(
      `event: ${event.summary} (${event.start?.dateTime} - ${event.end?.dateTime})`
    );
  });

  Log.log(
    `Got ${events.length} events (note this result will be capped at ${200} for safety)`
  );
}

export function debugExperimentalChecksForRestOfWeek(): void {
  Orchestrator.checkEvents(
    Orchestrator.experimentalChecks,
    GetEvents.getEventsForRestOfWeek(),
    true,
    Orchestrator.saveEvent
  );
}

export function debugRunAllChecksTillThroughEndOfNextWeekDryRun(): void {
  Orchestrator.checkEvents(
    Orchestrator.allChecks,
    GetEvents.getEventsThroughEndOfNextWeek(),
    true,
    Orchestrator.saveEvent
  );
}
