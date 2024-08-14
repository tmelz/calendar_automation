import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";
import { EventUtil } from "./checks/event-util";

/**
 * TODO high level plan for defrag
 *
 * need to know constraints
 * - what meetings need to move / can move
 *   - OOO meetings
 *   - conflicted meetings
 *   - o/w all 1:1s
 * - what optional meeting destinations there are (from my cal and theirs)
 *   - ✅ thus need to know working hours
 * - if a meeting is a recurring meeting, need to know cadence so i can understand how much it can move
 *   - eg weekly 1:1s should only move +/- 1 day; 👌 I can just use presence of "recurringEventId" as a rough first pass.
 *          for more thorough i could fetch the actual event and then parse the recurrenc rule:
 *            "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=FR"],
 *          not super important to get this precise. wondering if there's some way to improve this so it isn't so manual
 *          to get the details but that's OK for now. it limits some options but probably not by too much.
 *          practically speaking being able to shift by +/- 1 day is decent, for biweekly i'd allow like +/-2 i guess
 *
 * need to supply scoring function
 * - negative points
 *  - [day] if longer than 2hrs of meetings
 *  - [day] if gap between meetings
 *  - [week] if meetings are not balanced across days
 * - positive points
 *  - [day] more focus time
 */

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WorkingHours {
  export type TimeRange = {
    startTime: number;
    endTime: number;
  };

  // TODO cache this per email
  export function estimateWorkingHours(email: string): WorkingHours.TimeRange {
    const today = new Date();
    const lookBack = new Date(today);
    lookBack.setMonth(lookBack.getMonth() - 3);

    const events = GetEvents.getEventsForDateRangeCustomCalendar(
      lookBack,
      today,
      email,
      undefined,
      undefined,
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
    // relevantEvents.forEach((event) => {
    //   console.log(`${event.summary}`);
    // });

    // Convert events to tuples of (event, startTimeOfDay, endTimeOfDay)
    const eventTuples = relevantEvents.map((event) => {
      const startTimeOfDay = getTimeOfDay(new Date(event.start!.dateTime!));
      const endTimeOfDay = getTimeOfDay(new Date(event.end!.dateTime!));
      return { event, startTimeOfDay, endTimeOfDay };
    });

    // Sort tuples by start time and end time
    const sortedByStartTime = eventTuples
      .slice()
      .sort((a, b) => a.startTimeOfDay - b.startTimeOfDay);
    const sortedByEndTime = eventTuples
      .slice()
      .sort((a, b) => a.endTimeOfDay - b.endTimeOfDay);

    // Calculate the 10th percentile for start time and 90th percentile for end time
    const p10Index = Math.floor(sortedByStartTime.length * 0.1);
    const p90Index = Math.floor(sortedByEndTime.length * 0.9);

    // Get the 10th percentile start time and 90th percentile end time
    const p10StartTime = sortedByStartTime[p10Index].startTimeOfDay;
    const p90EndTime = sortedByEndTime[p90Index].endTimeOfDay;

    Log.log(`10th percentile start time: ${formatTime(p10StartTime)}`);
    Log.log(`90th percentile end time: ${formatTime(p90EndTime)}`);

    return {
      startTime: p10StartTime,
      endTime: p90EndTime,
    };
  }

  export function getTimeOfDay(date: Date): number {
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
