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

    // TODO clean up this filtering
    events
      .filter(
        (event) =>
          (event.eventType === "default" &&
            event.attendees &&
            event.attendees.length >= 1) ||
          !event.summary?.toLocaleLowerCase()?.includes("lunch")
      )
      .forEach((event) => {
        // If no start, skip
        // If all day event, skip for this calc
        if (event.start === undefined || event.start.date !== undefined) {
          return;
        }
        const eventTiming = modifiedEventTimings.get(event.id!);
        const eventDate = eventTiming
          ? new Date(
              new Date().setDate(
                new Date().getDate() +
                  eventTiming.dayOfWeek -
                  new Date().getDay()
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

    // Add cost based on time difference between event start and modified timing
    cost += CalendarCost.calculateMovingMeetingPenalty(
      events,
      modifiedEventTimings
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

    sortedMeetings.forEach((meeting) => {
      const meetingDuration = meeting.endTime - meeting.startTime;
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

    // Finalize the longest meeting stretch
    longestMeetingStretch = Math.max(
      longestMeetingStretch,
      currentMeetingStretch
    );

    return {
      meetingHours: totalMeetingTime / 3600, // convert to hours
      longestMeetingStretchHours: longestMeetingStretch / 3600, // convert to hours
      focusTimeOneHourPlus: focusTimeOneHourPlus / 3600, // convert to hours
    };
  }
}
