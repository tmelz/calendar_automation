import { WorkingHours } from "./working-hours";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CalendarCost {
  export type CostFactorsPerDay = {
    // total time spent in meetings, for eventType="default" and have other attendees
    meetingHours: number;
    // longest stretch of continuous time in meetings
    longestMeetingStretchHours: number;
    // time not in meetings that is not interrupted for at least 1 hour
    focusTimeOneHourPlus: number;
  };

  export function calculateCost(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    workingHours: WorkingHours.TimeRange
  ): number {
    const eventsByDay: {
      [date: string]: GoogleAppsScript.Calendar.Schema.Event[];
    } = {};

    events.forEach((event) => {
      const date = new Date(event.start!.dateTime!);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        return;
      }

      const eventDate = date.toDateString();
      if (!eventsByDay[eventDate]) {
        eventsByDay[eventDate] = [];
      }
      eventsByDay[eventDate].push(event);
    });

    const costFactorsArray: CalendarCost.CostFactorsPerDay[] = Object.keys(
      eventsByDay
    ).map((date) => {
      const dayEvents = eventsByDay[date];
      return CalendarCost.calculateCostFactorsPerDay(dayEvents, workingHours);
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

    return cost;
  }

  // todo also take in modifiable events
  export function calculateCostFactorsPerDay(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    workingHours: WorkingHours.TimeRange
  ): CostFactorsPerDay {
    // TODO incorporate weekends somehow
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
    const workDayStart = workingHours.startTime;
    const workDayEnd = workingHours.endTime;

    // Sort meetings by start time
    const sortedMeetings = meetingEvents
      .map((event) => ({
        startTime: WorkingHours.getTimeOfDay(new Date(event.start!.dateTime!)),
        endTime: WorkingHours.getTimeOfDay(new Date(event.end!.dateTime!)),
      }))
      .sort((a, b) => a.startTime - b.startTime);

    // Map lunch events to time ranges
    const lunchTimeRanges = lunchEvents.map((event) => ({
      startTime: WorkingHours.getTimeOfDay(new Date(event.start!.dateTime!)),
      endTime: WorkingHours.getTimeOfDay(new Date(event.end!.dateTime!)),
    }));

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
