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
    const cacheKey = `workingHours_${email}_v2`;
    const cachedValue = cache.get(cacheKey);

    if (cachedValue) {
      Log.log(`Cache hit for ${email}`);
      return JSON.parse(cachedValue) as WorkingHours.TimeRange;
    }

    Log.log(`Cache miss for ${email}, calculating working hours`);

    const today = new Date();
    const lookBack = new Date(today);
    // TODO play around with this threshold
    lookBack.setMonth(lookBack.getMonth() - 1);

    const events = GetEvents.getEventsForDateRangeCustomCalendar(
      lookBack,
      today,
      email,
      undefined,
      // TODO
      2500,
      true
    );

    const relevantEvents = events.filter((event) => {
      return (
        event.eventType === "focusTime" ||
        (event.eventType === "default" &&
          event.summary?.includes("Focus Time (via Clockwise)")) ||
        (event.eventType === "default" &&
          EventUtil.didRSVPYes(event, email) &&
          EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees))
      );
    });

    if (relevantEvents.length === 0) {
      Log.log(
        `Error calculating working hours for  ${email}, probably they use a lot of private events or somethign?? TODO`
      );
      // date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
      // TODO fix hack but assume 9-5 local
      return { startTimeSeconds: 9 * 3600, endTimeSeconds: 17 * 3600 };
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

    const p10Index = Math.floor(sortedByStartTime.length * 0.1);
    const p90Index = Math.floor(sortedByEndTime.length * 0.9);

    const p10StartTime = sortedByStartTime[p10Index].startTimeOfDay;
    const p90EndTime = sortedByEndTime[p90Index].endTimeOfDay;

    Log.log(`10th percentile start time: ${formatTime(p10StartTime)}`);
    Log.log(`90th percentile end time: ${formatTime(p90EndTime)}`);

    const timeRange: WorkingHours.TimeRange = {
      startTimeSeconds: p10StartTime,
      endTimeSeconds: p90EndTime,
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
