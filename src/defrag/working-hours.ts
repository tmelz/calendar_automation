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
    const cacheKey = `workingHours_${email}_v5`;
    const cachedValue = cache.get(cacheKey);

    if (cachedValue) {
      Log.log(`Cache hit for ${email}: ${cachedValue}`);
      return JSON.parse(cachedValue) as WorkingHours.TimeRange;
    }

    Log.log(`Cache miss for ${email}, calculating working hours`);

    const today = new Date();
    const lookBack = new Date(today);
    // TODO play around with this threshold
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

    const relevantEvents = events.filter((event) => {
      return (
        // event.eventType === "focusTime" ||
        // (event.eventType === "default" &&
        //   event.summary?.includes("Focus Time (via Clockwise)")) ||
        event.eventType === "default" &&
        EventUtil.didRSVPYes(event, email) &&
        EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees)
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

    // console.log(eventTuples.map((eventTuple) => eventTuple.startTimeOfDay));

    const p05Index = Math.floor(sortedByStartTime.length * 0.05);
    const p90Index = Math.floor(sortedByEndTime.length * 0.9);

    const p5StartTime = sortedByStartTime[p05Index].startTimeOfDay;
    const p95EndTime = sortedByEndTime[p90Index].endTimeOfDay;
    // round to the nearest multiple of 1800
    const roundedStartTime = Math.floor(p5StartTime / 1800) * 1800;
    const roundedEndTime = Math.ceil(p95EndTime / 1800) * 1800;

    Log.log(`5th percentile start time: ${formatTime(p5StartTime)}`);
    Log.log(`95th percentile end time: ${formatTime(p95EndTime)}`);

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
