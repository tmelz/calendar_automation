import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { Pagerduty } from "../pagerduty";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TeamCalendarOncall {
  export type GroupMember = {
    email: string;
    name: string | undefined;
  };

  export type CalendarChanges = {
    deleteEvents: GoogleAppsScript.Calendar.Schema.Event[];
    newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[];
  };

  export function syncCalendarOncall(
    timeMin: Date,
    timeMax: Date,
    calendarId: string,
    oncallScheduleId: string,
    dryRun: boolean = false
  ): void {
    Log.logPhase(
      `Running for calendar: ${calendarId}, oncallScheduleId: ${oncallScheduleId}`
    );

    const oncallResponse = Pagerduty.listOnCalls(
      timeMin.toDateString(),
      timeMax.toDateString(),
      [oncallScheduleId]
    );

    if (oncallResponse === null) {
      Log.log("Error, no oncalls found");
      return;
    }

    const oncalls = deduplicateOncalls(oncallResponse);
    Log.log(`Got oncalls: before deduplication: ${oncallResponse?.length}`);
    Log.log(`After deduplication: ${oncalls?.length}`);
    oncalls.forEach((oncall) => {
      Log.log(
        `oncall: ${oncall.id} ${oncall.user.name} ${oncall.user.email} ${oncall.schedule.summary}`
      );
    });

    // There's some slight differences in how Pagerduty and Google handle dates here,
    // so we need to -1 the start date, otherwise Pagerduty will return an oncall we won't
    // have a matching event for.
    const adjustedTimeMin = new Date(
      timeMin.getTime() - 1 * 24 * 60 * 60 * 1000
    );
    const teamCalendarOncallEvents =
      GetEvents.getEventsForDateRangeCustomCalendar(
        adjustedTimeMin,
        timeMax,
        calendarId
      ).filter((event) => isOncallEventOnTeamCalendar(event));

    makeChanges(
      calendarId,
      getChanges(oncalls, teamCalendarOncallEvents),
      dryRun
    );
  }

  // TODO better understand this, but if an oncall has multiple escalation policies,
  // the API response will have one oncall per escalation policy, even if the oncall
  // details are otherwise identical. Probably understandable but for our purposes
  // we only want one calendar event.
  export function deduplicateOncalls(
    oncalls: Pagerduty.OnCall[]
  ): Pagerduty.OnCall[] {
    return oncalls.filter(
      (oncall, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.user.email === oncall.user.email &&
            t.start === oncall.start &&
            t.end === oncall.end &&
            t.schedule.summary === oncall.schedule.summary
        )
    );
  }

  // get changes func, oncalls as input, team calendar oncall events as input, output calendar changes
  export function getChanges(
    oncalls: Pagerduty.OnCall[],
    teamCalendarOncallEvents: GoogleAppsScript.Calendar.Schema.Event[]
  ): CalendarChanges {
    const eventsToDelete: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const oncallsToCreateEventsFor: Pagerduty.OnCall[] = [];
    // Track which oncalls have been matched to events to ensure 1:1 mapping
    const matchedOncalls = new Set<string>();

    // Helper function to generate a unique key for an oncall
    function getOncallKey(oncall: Pagerduty.OnCall): string {
      return `${oncall.user.email}_${oncall.start}_${oncall.end}_${oncall.schedule.summary}`;
    }

    teamCalendarOncallEvents.forEach((event) => {
      // Find a matching oncall that hasn't been matched yet
      const matchingOncall = oncalls?.find((oncall) => {
        return (
          !matchedOncalls.has(getOncallKey(oncall)) &&
          oncallAndEventMatch(oncall, event)
        );
      });

      if (matchingOncall === undefined) {
        Log.log(
          "No matching oncall for event, deleting (event: " +
            event.summary +
            ")"
        );
        eventsToDelete.push(event);
      } else {
        // Mark this oncall as matched so it won't match with other events
        matchedOncalls.add(getOncallKey(matchingOncall));
      }
    });

    oncalls.forEach((oncall) => {
      const matchingEvent = teamCalendarOncallEvents.find((event) =>
        oncallAndEventMatch(oncall, event)
      );
      if (matchingEvent === undefined) {
        Log.log(
          "No matching event for oncall, creating (oncall: " +
            oncall.user.name +
            ")"
        );
        oncallsToCreateEventsFor.push(oncall);
      }
    });

    return {
      deleteEvents: eventsToDelete,
      newTimeRangeEvents: oncallsToCreateEventsFor.map((oncall) => ({
        startDateTime: oncall.start,
        endDateTime: oncall.end,
        title: createEventTitle(
          oncall.user.name,
          oncall.user.email,
          oncall.schedule.summary
        ),
      })),
    };
  }

  export function oncallAndEventMatch(
    oncall: Pagerduty.OnCall,
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    Log.log("Comparing oncall and event");
    Log.log(
      `oncall: ${oncall.user.name} ${oncall.user.email} ${oncall.schedule.summary}`
    );
    Log.log(`event: ${event.summary}`);
    const expectedTitle = createEventTitle(
      oncall.user.name,
      oncall.user.email,
      oncall.schedule.summary
    );
    const titleMatch = event.summary === expectedTitle;
    Log.log(
      "Does title match expectation? " +
        titleMatch +
        " expected:" +
        expectedTitle
    );
    Log.log(`expectedTitle: ${expectedTitle}`);
    Log.log(
      "Do dates match? " +
        (event.start?.dateTime !== undefined &&
          event.end?.dateTime !== undefined &&
          new Date(event.start!.dateTime!).getTime() ===
            new Date(oncall.start).getTime() &&
          new Date(event.end!.dateTime!).getTime() ===
            new Date(oncall.end).getTime())
    );
    Log.log(
      "Start dates: " +
        new Date(event.start!.dateTime!).getTime() +
        " " +
        new Date(oncall.start).getTime()
    );
    Log.log(
      "End dates: " +
        new Date(event.end!.dateTime!).getTime() +
        " " +
        new Date(oncall.end).getTime()
    );
    const overallMatch =
      event.summary === expectedTitle &&
      event.start?.dateTime !== undefined &&
      event.end?.dateTime !== undefined &&
      new Date(event.start!.dateTime!).getTime() ===
        new Date(oncall.start).getTime() &&
      new Date(event.end!.dateTime!).getTime() ===
        new Date(oncall.end).getTime();
    Log.log("Overall match: " + overallMatch);
    return overallMatch;
  }

  export function makeChanges(
    calendarId: string,
    changes: CalendarChanges,
    dryRun: boolean = false
  ): void {
    Log.logPhase(
      `Making changes for calendar: ${calendarId} (dry run: ${dryRun})`
    );
    Log.log(`Deleting events: ${changes.deleteEvents}`);
    changes.deleteEvents.forEach((event) => {
      Log.log(`Deleting event: ${event.summary}, ${event.id}`);
      if (!isOncallEventOnTeamCalendar(event)) {
        throw new Error("invariant violation: deleting non-oncall event");
      }
      if (dryRun) {
        Log.log("Dry run, not deleting event");
      } else {
        CalendarApp.getCalendarById(calendarId)
          .getEventById(event.id!)
          .deleteEvent();
      }
    });

    Log.log(`Creating new time range events:`);
    changes.newTimeRangeEvents.forEach((event) => {
      Log.log(
        "Creating new time range event: " +
          event.title +
          " from " +
          event.startDateTime +
          " to " +
          event.endDateTime
      );
      if (dryRun) {
        Log.log("Dry run, not creating event");
      } else {
        CalendarApp.getCalendarById(calendarId).createEvent(
          event.title,
          new Date(event.startDateTime),
          new Date(event.endDateTime)
        );
      }
    });
  }

  export function isAllDayEvent(event: GoogleAppsScript.Calendar.Schema.Event) {
    return (
      event.start?.dateTime === undefined || event.end?.dateTime === undefined
    );
  }

  export function isSpecificTimeEvent(
    event: GoogleAppsScript.Calendar.Schema.Event
  ) {
    return (
      event.start?.dateTime !== undefined && event.end?.dateTime !== undefined
    );
  }

  export function createEventTitle(
    personName: string,
    email: string,
    schedule: string
  ): string {
    return `[oncall] ${personName} (${email}), schedule: ${schedule}`;
  }

  export function isOncallEventOnTeamCalendar(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    return (
      (event.summary?.startsWith("[oncall]") ?? false) &&
      event.eventType === "default" &&
      event.attendees === undefined &&
      event.conferenceData === undefined
    );
  }

  export function extractEmail(input: string | undefined): string | undefined {
    if (input === undefined) {
      return undefined;
    }

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = input.match(emailRegex);

    // Return the email if found, otherwise return null
    return match ? match[1] : undefined;
  }
}
