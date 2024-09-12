import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { EventUtil } from "../checks/event-util";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WorkingHours {
  export type TimeRange = {
    startTimeSeconds: number;
    endTimeSeconds: number;
  };

  export function estimateWorkingHours(email: string): WorkingHours.TimeRange {
    const cache = CacheService.getUserCache();
    const cacheKey = `workingHours_${email}_v7`;
    const cachedValue = cache.get(cacheKey);

    if (cachedValue) {
      Log.log(`Cache hit for ${email}: ${cachedValue}`);
      return JSON.parse(cachedValue) as WorkingHours.TimeRange;
    }

    Log.log(`Cache miss for ${email}, calculating working hours`);

    const today = new Date();
    const lookBack = new Date(today);
    lookBack.setMonth(lookBack.getMonth() - 2);

    const events = GetEvents.getEventsForDateRangeCustomCalendar(
      lookBack,
      today,
      email,
      undefined,
      // TODO
      2500,
      true
    );

    // Only look at events that are type=default (not focus time), not all day events,
    // where they RSVP'd yes, and all attendees have the same business email domain.
    // This should focus on meetings they actually go to, and also personal meetings on work calendar.
    let relevantEvents = events.filter((event) => {
      Log.log(JSON.stringify(event));
      return (
        // event.eventType === "focusTime" ||
        // (event.eventType === "default" &&
        //   event.summary?.includes("Focus Time (via Clockwise)")) ||
        event.eventType === "default" &&
        EventUtil.didRSVPYes(event, email) &&
        EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees) &&
        event.start?.dateTime !== undefined &&
        event.end?.dateTime !== undefined
      );
    });

    // Private events look like this and wont pass the above filter, because they dont have eventType set.
    // If we didn't get any events to analyze, relax our
    // {
    //   "etag": "\"3451150106884000\"",
    //   "updated": "2024-09-05T22:24:13.442Z",
    //   "kind": "calendar#event",
    //   "htmlLink": "https://www.google.com/calendar/event?eid=NGQ4aWZoYTlkdXVtYmhybzczNmgyMDBzODUgZWJhcmFqYXNAc3F1YXJldXAuY29t",
    //   "start": {
    //     "dateTime": "2024-09-05T14:30:00-04:00",
    //     "timeZone": "America/New_York"
    //   },
    //   "end": {
    //     "dateTime": "2024-09-05T15:00:00-04:00",
    //     "timeZone": "America/New_York"
    //   },
    //   "visibility": "private",
    //   "status": "confirmed",
    //   "id": "4d8ifha9duumbhro736h200s85",
    //   "iCalUID": "4d8ifha9duumbhro736h200s85@google.com"
    // }
    if (relevantEvents.length === 0) {
      Log.log(
        `Error calculating working hours for  ${email}, probably they use a lot of private events? Relaxing constraints and trying again`
      );

      relevantEvents = events.filter((event) => {
        return (
          event.start?.dateTime !== undefined &&
          event.end?.dateTime !== undefined
        );
      });

      // No luck guessing work hours at all, this should only happen if we don't even have read
      // access to their calendar, or they have no events at all in the lookback period.
      if (relevantEvents.length === 0) {
        Log.log(
          `Still error getting working hours for ${email}, even with relaxing constraints to allow private events; defaulting to assume 9-5 pacific`
        );
        return { startTimeSeconds: 9 * 3600, endTimeSeconds: 17 * 3600 };
      }
    }

    const eventTuples = relevantEvents.map((event) => {
      const startTimeOfDay = getTimeOfDaySeconds(
        new Date(event.start!.dateTime!)
      );
      const endTimeOfDay = getTimeOfDaySeconds(new Date(event.end!.dateTime!));
      return { event, startTimeOfDay, endTimeOfDay };
    });

    const sortedByStartTime = eventTuples
      .slice()
      .sort((a, b) => a.startTimeOfDay - b.startTimeOfDay);
    const sortedByEndTime = eventTuples
      .slice()
      .sort((a, b) => a.endTimeOfDay - b.endTimeOfDay);

    const p05Index = Math.floor(sortedByStartTime.length * 0.05);
    const p90Index = Math.floor(sortedByEndTime.length * 0.9);

    const p5StartTime = sortedByStartTime[p05Index].startTimeOfDay;
    const p90EndTime = sortedByEndTime[p90Index].endTimeOfDay;
    // round to the nearest multiple of 1800
    const roundedStartTime = Math.floor(p5StartTime / 1800) * 1800;
    const roundedEndTime = Math.ceil(p90EndTime / 1800) * 1800;

    Log.log(`5th percentile start time: ${formatTime(p5StartTime)}`);
    Log.log(`90th percentile end time: ${formatTime(p90EndTime)}`);

    const timeRange: WorkingHours.TimeRange = {
      startTimeSeconds: roundedStartTime,
      endTimeSeconds: roundedEndTime,
    };

    // Cache the result, with an expiration of 1 month (30 days)
    cache.put(cacheKey, JSON.stringify(timeRange), 2592000); // 30 days in seconds

    return timeRange;
  }

  export function getTimeOfDaySeconds(date: Date): number {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

  export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
  }
}
