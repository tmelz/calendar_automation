import { Time } from "./time";
import { LogLevel, Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetEvents {
  const CALENDAR_ID: string = "primary";
  export const MAX_EVENTS_ALLOWED_TO_FETCH: number = 200;
  const MAX_LOOK_AHEAD_DAYS: number = 10;

  export type EventFetcher = (
    timeMin: Date,
    timeMax: Date,
    calendarId: string
  ) => GoogleAppsScript.Calendar.Schema.Event[];

  export type EventFetcherWithError = (
    timeMin: Date,
    timeMax: Date,
    calendarId: string
  ) => GoogleAppsScript.Calendar.Schema.Event[] | undefined;

  export function getEvents(
    timeRange: Time.Range,
    updatedMin: Date | undefined
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    return getEventsForDateRangeCustomCalendar(
      timeRange.timeMin,
      timeRange.timeMax,
      CALENDAR_ID,
      updatedMin
    );
  }

  export function getEventsForRestOfDay(): GoogleAppsScript.Calendar.Schema.Event[] {
    return getEventsForRestOfDayPlusLookAhead(0);
  }

  export function getEventsForRestOfWeek(): GoogleAppsScript.Calendar.Schema.Event[] {
    const today: Date = new Date();
    const sunday: Date = Time.getSundayOfCurrentWeek();
    sunday.setHours(24, 0, 0, 0);
    return getEventsForDateRange(today, sunday);
  }

  export function getEventsForNextWeek(): GoogleAppsScript.Calendar.Schema.Event[] {
    const sunday: Date = Time.getSundayOfCurrentWeek();
    sunday.setHours(24, 0, 0, 0);
    const followingSunday: Date = Time.getSundayOfCurrentWeek();
    followingSunday.setDate(followingSunday.getDate() + 7);
    followingSunday.setHours(24, 0, 0, 0);

    return getEventsForDateRange(sunday, followingSunday);
  }

  export function getEventsThroughEndOfNextWeek(): GoogleAppsScript.Calendar.Schema.Event[] {
    const today: Date = new Date();
    const followingSunday: Date = Time.getSundayOfCurrentWeek();
    followingSunday.setDate(followingSunday.getDate() + 7);
    followingSunday.setHours(24, 0, 0, 0);

    return getEventsForDateRange(today, followingSunday);
  }

  export function getEventsForRestOfDayPlusLookAhead(
    daysToLookAhead: number
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    const cappedDaysToLookAhead: number = Math.min(
      daysToLookAhead,
      MAX_LOOK_AHEAD_DAYS
    );
    const now: Date = new Date();

    // run for tomorrow?
    const nextMidnight: Date = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    nextMidnight.setDate(nextMidnight.getDate() + cappedDaysToLookAhead);

    return getEventsForDateRange(now, nextMidnight);
  }

  export function getEventsForDateRange(
    timeMin: Date,
    timeMax: Date
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    return getEventsForDateRangeCustomCalendar(timeMin, timeMax, CALENDAR_ID);
  }

  export function getEventsForDateRangeCustomCalendar(
    timeMin: Date,
    timeMax: Date,
    calendarId: string,
    updatedMin: Date | undefined = undefined,
    maxResults: number | undefined = undefined,
    suppressEventListLog: boolean = false
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    const result: GoogleAppsScript.Calendar.Schema.Event[] | undefined =
      getEventsForDateRangeCustomCalendarWithErrorCatch(
        timeMin,
        timeMax,
        calendarId,
        updatedMin,
        maxResults,
        suppressEventListLog
      );

    if (result === undefined) {
      throw new Error("Error fetching events");
    }

    return result;
  }

  export function getEventsForDateRangeCustomCalendarWithErrorCatch(
    timeMin: Date,
    timeMax: Date,
    calendarId: string,
    updatedMin: Date | undefined = undefined,
    maxResults: number | undefined = GetEvents.MAX_EVENTS_ALLOWED_TO_FETCH,
    suppressEventListLog: boolean = false
  ): GoogleAppsScript.Calendar.Schema.Event[] | undefined {
    try {
      Log.log(
        `🕵️ Fetching events for calendarId="${calendarId}": "${timeMin.toLocaleString()}" till "${timeMax.toLocaleString()}" with updatedMin:${updatedMin?.toLocaleString()}`
      );

      const events: GoogleAppsScript.Calendar.Schema.Event[] =
        Calendar.Events?.list(calendarId, {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: maxResults,
          // updatedMin: updatedMin?.toISOString(),
        })?.items ?? [];

      if (events.length === 0) {
        Log.log("No events found.");
        return [];
      }

      Log.log(
        `Got ${events.length} events (note this result will be capped at ${maxResults} for safety)`
      );
      const cappedResults = events.slice(0, maxResults);
      if (!suppressEventListLog) {
        for (const event of cappedResults) {
          Log.log(
            `📅 "${event.summary}" ${event.summary === undefined ? "(undefined may mean event is private)" : ""}`
          );
        }
      }
      return cappedResults;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Log.log(`Error fetching events: ${error.message}`);
      return undefined;
    }
  }
}
