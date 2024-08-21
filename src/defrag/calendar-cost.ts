import { WorkingHours } from "./working-hours";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CalendarCost {
  export const ROUGH_MAX_COST = 20;

  export type CostFactorsPerDay = {
    // total time spent in meetings, for eventType="default" and have other attendees
    meetingHours: number;
    // longest stretch of continuous time in meetings
    longestMeetingStretchHours: number;
    // time not in meetings that is not interrupted for at least 1 hour
    focusTimeOneHourPlus: number;
  };

  export type EventTiming = {
    dayOfWeek: number;
    startTimeOfDaySeconds: number;
    endTimeOfDaySeconds: number;
  };

  export function calculateCost(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    modifiedEventTimings: Map<string, EventTiming>,
    workingHours: WorkingHours.TimeRange
  ): number {
    const eventsByDay: {
      [date: string]: GoogleAppsScript.Calendar.Schema.Event[];
    } = {};

    events.forEach((event) => {
      const eventTiming = modifiedEventTimings.get(event.id!);
      const eventDate = eventTiming
        ? new Date(
            new Date().setDate(
              new Date().getDate() + eventTiming.dayOfWeek - new Date().getDay()
            )
          )
        : new Date(event.start!.dateTime!);

      // Skip weekends if not already handled in the timing
      if (eventDate.getDay() === 0 || eventDate.getDay() === 6) {
        return;
      }

      const eventDateString = eventDate.toDateString();
      if (!eventsByDay[eventDateString]) {
        eventsByDay[eventDateString] = [];
      }
      eventsByDay[eventDateString].push(event);
    });

    const costFactorsArray: CalendarCost.CostFactorsPerDay[] = Object.keys(
      eventsByDay
    ).map((date) => {
      const dayEvents = eventsByDay[date];
      return CalendarCost.calculateCostFactorsPerDay(
        dayEvents,
        modifiedEventTimings,
        workingHours
      );
    });

    let cost = 0;
    // Baseline cost is all meeting hours
    cost += costFactorsArray.reduce(
      (sum, costFactors) => costFactors.meetingHours + sum,
      0
    );
    // Every meeting after 2 continuous hours costs 3x
    costFactorsArray.forEach((costFactors) => {
      if (costFactors.longestMeetingStretchHours > 2) {
        cost += (costFactors.longestMeetingStretchHours - 2) * 3;
      }
    });

    // Each focus time hour can offset half hour of meeting cost
    costFactorsArray.forEach((costFactors) => {
      cost -= costFactors.focusTimeOneHourPlus / 2;
    });

    const meetingHours = costFactorsArray
      .map((costFactors) => costFactors.meetingHours)
      // Sort in ascending order
      .sort((a, b) => a - b);
    // Look at the difference between the heaviest meeting day
    // and the second lightest; assume lightest is a no meeting day
    // Weigh this delta heavily to encourage spreading meetings out
    if (meetingHours.length == 5) {
      cost += (meetingHours[4] - meetingHours[1]) * 4;
    }

    return cost / CalendarCost.ROUGH_MAX_COST;
  }

  export function calculateCostFactorsPerDay(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    modifiedEventTimings: Map<string, EventTiming>,
    workingHours: WorkingHours.TimeRange
  ): CostFactorsPerDay {
    const meetingEvents = events.filter(
      (event) =>
        event.eventType === "default" &&
        event.attendees &&
        event.attendees.length >= 1 &&
        !event.summary?.toLocaleLowerCase()?.includes("lunch")
    );

    const lunchEvents = events.filter((event) =>
      event.summary?.toLocaleLowerCase()?.includes("lunch")
    );

    let totalMeetingTime = 0;
    let longestMeetingStretch = 0;
    let focusTimeOneHourPlus = 0;

    // Convert working hours to seconds for easier calculations
    const workDayStart = workingHours.startTimeSeconds;
    const workDayEnd = workingHours.endTimeSeconds;

    // Sort meetings by start time, using modified timings if available
    const sortedMeetings = meetingEvents
      .map((event) => {
        const timing = modifiedEventTimings.get(event.id!);
        return timing
          ? {
              startTime: timing.startTimeOfDaySeconds,
              endTime: timing.endTimeOfDaySeconds,
            }
          : {
              startTime: WorkingHours.getTimeOfDaySeconds(
                new Date(event.start!.dateTime!)
              ),
              endTime: WorkingHours.getTimeOfDaySeconds(
                new Date(event.end!.dateTime!)
              ),
            };
      })
      .sort((a, b) => a.startTime - b.startTime);

    // Map lunch events to time ranges using modified timings if available
    const lunchTimeRanges = lunchEvents.map((event) => {
      const timing = modifiedEventTimings.get(event.id!);
      return timing
        ? {
            startTime: timing.startTimeOfDaySeconds,
            endTime: timing.endTimeOfDaySeconds,
          }
        : {
            startTime: WorkingHours.getTimeOfDaySeconds(
              new Date(event.start!.dateTime!)
            ),
            endTime: WorkingHours.getTimeOfDaySeconds(
              new Date(event.end!.dateTime!)
            ),
          };
    });

    let previousEndTime = workDayStart;
    let currentMeetingStretch = 0;

    sortedMeetings.forEach((meeting, index) => {
      const meetingDuration = meeting.endTime - meeting.startTime;

      // Total meeting time
      totalMeetingTime += meetingDuration;

      // Check if this meeting is part of a continuous stretch
      if (meeting.startTime <= previousEndTime + 900) {
        // 900 seconds = 15 minutes, consider meetings within 15 minutes as continuous
        currentMeetingStretch += meetingDuration;
      } else {
        // If not continuous, finalize the previous stretch
        longestMeetingStretch = Math.max(
          longestMeetingStretch,
          currentMeetingStretch
        );
        currentMeetingStretch = meetingDuration;
      }

      // Update previous end time
      previousEndTime = meeting.endTime;

      // Calculate focus time between meetings if at least 1 hour gap and not lunch
      if (index > 0) {
        const previousMeetingEndTime = sortedMeetings[index - 1].endTime;
        const gapTime = meeting.startTime - previousMeetingEndTime;

        const isLunchGap = lunchTimeRanges.some(
          (lunch) =>
            lunch.startTime >= previousMeetingEndTime &&
            lunch.endTime <= meeting.startTime
        );

        if (gapTime >= 3600 && !isLunchGap) {
          focusTimeOneHourPlus += gapTime;
        }
      }
    });

    // Final check for the last meeting stretch
    longestMeetingStretch = Math.max(
      longestMeetingStretch,
      currentMeetingStretch
    );

    // Check for focus time after the last meeting until the end of the workday, excluding lunch
    const isLunchGapAfterLastMeeting = lunchTimeRanges.some(
      (lunch) =>
        lunch.startTime >= previousEndTime && lunch.endTime <= workDayEnd
    );

    if (
      previousEndTime < workDayEnd &&
      workDayEnd - previousEndTime >= 3600 &&
      !isLunchGapAfterLastMeeting
    ) {
      focusTimeOneHourPlus += workDayEnd - previousEndTime;
    }

    return {
      meetingHours: totalMeetingTime / 3600, // convert to hours
      longestMeetingStretchHours: longestMeetingStretch / 3600, // convert to hours
      focusTimeOneHourPlus: focusTimeOneHourPlus / 3600, // convert to hours
    };
  }
}
