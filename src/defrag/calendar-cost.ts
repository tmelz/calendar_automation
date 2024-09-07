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
    // time not in meetings that is not interrupted for at least 2 hours
    focusTimeTwoHoursPlus: number;
    // this shouldn't happen, but in case we're evaluating a calendar
    // before it's been optimized, we track overlaps to penalize them significantly
    overlappingMeetingHours: number;
  };

  export type EventTiming = {
    dayOfWeek: number;
    startTimeOfDaySeconds: number;
    endTimeOfDaySeconds: number;
  };

  function getLatestEventStartDate(
    events: GoogleAppsScript.Calendar.Schema.Event[]
  ): Date | null {
    let latestDate: Date | null = null;

    events.forEach((event) => {
      const startDateTime = event.start?.dateTime;
      if (startDateTime) {
        const eventDate = new Date(startDateTime);
        if (!latestDate || eventDate > latestDate) {
          latestDate = eventDate;
        }
      }
    });

    return latestDate;
  }

  export function calculateCost(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    modifiedEventTimings: Map<string, EventTiming>,
    workingHours: WorkingHours.TimeRange
  ): number {
    const eventsByDay: {
      [date: string]: GoogleAppsScript.Calendar.Schema.Event[];
    } = {};

    const filteredEvents = events.filter(
      (event) =>
        (event.eventType === "default" &&
          event.attendees &&
          event.attendees.length >= 1) ||
        !event.summary?.toLocaleLowerCase()?.includes("lunch")
    );

    const latestEventStartDate = getLatestEventStartDate(filteredEvents);

    filteredEvents.forEach((event) => {
      // Skip events with no start date or all-day events
      if (event.start === undefined || event.start.date !== undefined) {
        return;
      }

      const eventTiming = modifiedEventTimings.get(event.id!);
      const eventDate = eventTiming
        ? new Date(
            new Date(latestEventStartDate!).setDate(
              latestEventStartDate!.getDate() +
                eventTiming.dayOfWeek -
                latestEventStartDate!.getDay()
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

    // Ensure there are entries for every weekday (Mon-Fri) in the week of latestEventStartDate
    for (let i = 1; i <= 5; i++) {
      const date = new Date(latestEventStartDate!);
      date.setDate(
        latestEventStartDate!.getDate() - latestEventStartDate!.getDay() + i
      );
      const dateString = date.toDateString();
      if (!eventsByDay[dateString]) {
        eventsByDay[dateString] = [];
      }
    }

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

    // Add cost based on time difference between event start and modified timing
    cost += CalendarCost.calculateMovingMeetingPenalty(
      events,
      modifiedEventTimings
    );

    // Every meeting after 2 continuous hours costs 3x
    costFactorsArray.forEach((costFactors) => {
      if (costFactors.longestMeetingStretchHours > 1.5) {
        cost += (costFactors.longestMeetingStretchHours - 1.5) * 6;
      }
    });

    // Each focus time hour can offset half hour of meeting cost
    costFactorsArray.forEach((costFactors) => {
      cost -= costFactors.focusTimeOneHourPlus / 2;
    });

    // win here needs to exceed cost of moving to another day
    costFactorsArray.forEach((costFactors) => {
      cost -= costFactors.focusTimeTwoHoursPlus * 0.75;
    });

    // The overlapping penalty is arbitary, just needs to be some big number
    cost += costFactorsArray.reduce(
      (sum, costFactors) => sum + costFactors.overlappingMeetingHours * 10,
      0
    );

    const meetingHours = costFactorsArray
      .map((costFactors) => costFactors.meetingHours)
      // Sort in ascending order
      .sort((a, b) => a - b);

    // Look at the difference between the heaviest meeting day
    // and the second lightest; assume lightest is a no meeting day
    // Weigh this delta heavily to encourage spreading meetings out
    if (meetingHours.length == 5) {
      // only kick in the penalty once the days diverge too much
      // over emphasizing spreading meeting load with no threshold
      // leads to weird behaviors
      if (meetingHours[4] - meetingHours[0] > 1.5) {
        cost += (meetingHours[4] - meetingHours[0]) * 2;
      }
    }

    return cost;
    // return cost / CalendarCost.ROUGH_MAX_COST;
  }

  export function calculateMovingMeetingPenalty(
    events: GoogleAppsScript.Calendar.Schema.Event[],
    modifiedEventTimings: Map<string, EventTiming>
  ): number {
    let cost = 0;
    events.forEach((event) => {
      if (event.start?.dateTime && modifiedEventTimings.has(event.id!)) {
        const originalStart = new Date(event.start.dateTime);
        const modifiedTiming = modifiedEventTimings.get(event.id!);
        if (modifiedTiming) {
          const modifiedStart = new Date(originalStart);
          modifiedStart.setHours(0, 0, 0, 0);
          modifiedStart.setDate(
            modifiedStart.getDate() +
              modifiedTiming.dayOfWeek -
              originalStart.getDay()
          );
          modifiedStart.setSeconds(modifiedTiming.startTimeOfDaySeconds);

          const differenceInHours =
            Math.abs(originalStart.getTime() - modifiedStart.getTime()) / 36e5;

          if (differenceInHours == 0) {
            return 0;
          }

          if (differenceInHours <= 8) {
            cost += 0.125;
          } else {
            cost += 0.25;
          }
        }
      }
    });
    return cost;
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
    let focusTimeTwoHoursPlus = 0;
    let overlappingMeetingHours = 0;

    const workDayStart = workingHours.startTimeSeconds;
    const workDayEnd = workingHours.endTimeSeconds;

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
      const meetingDurationRaw = meeting.endTime - meeting.startTime;
      // round meeting duration up to the next 15min interval
      const meetingDuration = Math.ceil(meetingDurationRaw / 900) * 900;
      totalMeetingTime += meetingDuration;

      const gapTime = meeting.startTime - previousEndTime;

      // Adjust gap time for any lunch break within the gap
      let adjustedGapTime = gapTime;
      lunchTimeRanges.forEach((lunch) => {
        if (
          lunch.startTime >= previousEndTime &&
          lunch.endTime <= meeting.startTime
        ) {
          adjustedGapTime -= lunch.endTime - lunch.startTime;
        }
      });

      // If the adjusted gap is greater than or equal to 1 hour, add it to focus time
      if (adjustedGapTime >= 3600) {
        focusTimeOneHourPlus += adjustedGapTime;
      }

      // If the adjusted gap is greater than or equal to 2 hours, add it to focus time
      if (adjustedGapTime >= 7200) {
        focusTimeTwoHoursPlus += adjustedGapTime;
      }

      // Update the longest meeting stretch
      if (gapTime > 900) {
        // 15 minutes
        longestMeetingStretch = Math.max(
          longestMeetingStretch,
          currentMeetingStretch
        );
        currentMeetingStretch = meetingDuration;
      } else {
        currentMeetingStretch += meetingDuration;
      }

      previousEndTime = meeting.endTime;

      // Check for overlaps with the next meeting
      if (index < sortedMeetings.length - 1) {
        const nextMeeting = sortedMeetings[index + 1];
        if (nextMeeting.startTime < meeting.endTime) {
          overlappingMeetingHours +=
            (meeting.endTime - nextMeeting.startTime) / 3600;
        }
      }
    });

    // Handle the final gap after the last meeting until the end of the workday
    let finalGapTime = workDayEnd - previousEndTime;
    lunchTimeRanges.forEach((lunch) => {
      if (lunch.startTime >= previousEndTime && lunch.endTime <= workDayEnd) {
        finalGapTime -= lunch.endTime - lunch.startTime;
      }
    });

    if (finalGapTime >= 3600) {
      focusTimeOneHourPlus += finalGapTime;
    }

    if (finalGapTime >= 7200) {
      focusTimeTwoHoursPlus += finalGapTime;
    }

    // Finalize the longest meeting stretch
    longestMeetingStretch = Math.max(
      longestMeetingStretch,
      currentMeetingStretch
    );

    return {
      meetingHours: totalMeetingTime / 3600, // convert to hours
      longestMeetingStretchHours: longestMeetingStretch / 3600, // convert to hours
      focusTimeOneHourPlus: focusTimeOneHourPlus / 3600, // convert to hours
      focusTimeTwoHoursPlus: focusTimeTwoHoursPlus / 3600, // convert to hours
      overlappingMeetingHours, // Overlapping hours in the day
    };
  }
}
