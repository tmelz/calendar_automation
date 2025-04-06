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
    updateEvents: {
      event: GoogleAppsScript.Calendar.Schema.Event;
      oncall: Pagerduty.OnCall;
    }[];
  };

  export function groupOncallSettingsByCalendar(
    oncallSettings: {
      calendarId: string;
      scheduleId: string;
    }[]
  ): Map<string, string[]> {
    // Group oncall settings by calendarId
    // we should change the UI to allow for multiple schedules per calendar, but
    // we can still do that in the future and this is probably a good fallback
    // protection anyway
    const oncallSettingsByCalendar = new Map<string, string[]>();

    oncallSettings.forEach(({ calendarId, scheduleId }) => {
      if (calendarId.trim().length == 0 || scheduleId.trim().length == 0) {
        throw new Error("invariant violation");
        return;
      }

      if (!oncallSettingsByCalendar.has(calendarId)) {
        oncallSettingsByCalendar.set(calendarId, []);
      }
      oncallSettingsByCalendar.get(calendarId)!.push(scheduleId);
    });

    return oncallSettingsByCalendar;
  }

  export function syncCalendarOncalls(
    timeMin: Date,
    timeMax: Date,
    oncallSettings: {
      calendarId: string;
      scheduleId: string;
    }[],
    isDryRun: boolean = false,
    inviteOncallEmail: boolean = false
  ): void {
    const oncallSettingsByCalendar =
      groupOncallSettingsByCalendar(oncallSettings);

    // Process each calendar with all its schedule IDs
    oncallSettingsByCalendar.forEach((scheduleIds, calendarId) => {
      syncCalendarOncall(
        timeMin,
        timeMax,
        calendarId,
        scheduleIds,
        isDryRun,
        inviteOncallEmail
      );
    });
  }

  export function syncCalendarOncall(
    timeMin: Date,
    timeMax: Date,
    calendarId: string,
    oncallScheduleIds: string[],
    dryRun: boolean = false,
    inviteOncallEmail: boolean = false
  ): void {
    Log.logPhase(
      `Running for calendar: ${calendarId}, oncallScheduleIds: ${oncallScheduleIds}`
    );
    if (oncallScheduleIds.length === 0) {
      Log.log("No oncall schedule ids provided, skipping");
      return;
    }

    const oncallResponse = Pagerduty.listOnCalls(
      timeMin.toDateString(),
      timeMax.toDateString(),
      oncallScheduleIds
    );

    if (oncallResponse === null) {
      Log.log("Error, no oncalls found");
      return;
    }

    const oncalls = deduplicateOncalls(oncallResponse);
    Log.log(`Got oncalls: before deduplication: ${oncallResponse?.length}`);
    Log.log(`After deduplication: ${oncalls?.length}`);
    Log.log("List of oncalls:");
    oncalls.forEach((oncall) => {
      Log.log(
        `oncall: ${oncall.user.name} ${oncall.user.email} ${oncall.schedule.summary} ${oncall.start} ${oncall.end}`
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
      getChanges(oncalls, teamCalendarOncallEvents, inviteOncallEmail),
      dryRun,
      inviteOncallEmail
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
    teamCalendarOncallEvents: GoogleAppsScript.Calendar.Schema.Event[],
    inviteOncallEmail: boolean = false
  ): CalendarChanges {
    const eventsToDelete: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const oncallsToCreateEventsFor: Pagerduty.OnCall[] = [];
    const eventsToUpdate: {
      event: GoogleAppsScript.Calendar.Schema.Event;
      oncall: Pagerduty.OnCall;
    }[] = [];
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

        // Check if the event needs to be updated based on inviteOncallEmail setting
        const needsUpdate = doesEventNeedUpdate(
          event,
          matchingOncall,
          inviteOncallEmail
        );
        if (needsUpdate) {
          Log.log(
            `Event for ${matchingOncall.user.email} needs to be updated to match inviteOncallEmail=${inviteOncallEmail}`
          );
          eventsToUpdate.push({ event, oncall: matchingOncall });
        }
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
      updateEvents: eventsToUpdate,
    };
  }

  // Helper function to determine if an event needs updating
  export function doesEventNeedUpdate(
    event: GoogleAppsScript.Calendar.Schema.Event,
    oncall: Pagerduty.OnCall,
    inviteOncallEmail: boolean
  ): boolean {
    // Check if transparency (free/busy) or attendees need updating
    const hasGuestEmail =
      event.attendees?.some(
        (attendee) => attendee.email === oncall.user.email
      ) || false;
    const isTransparent = event.transparency === "transparent";

    if (inviteOncallEmail) {
      // Should have the oncall person as guest and be transparent
      return !hasGuestEmail || !isTransparent;
    } else {
      // Should not have the oncall person as guest
      return hasGuestEmail;
    }
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
    dryRun: boolean = false,
    inviteOncallEmail: boolean = false
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

    Log.log(`Updating existing events:`);
    changes.updateEvents.forEach(({ event, oncall }) => {
      Log.log(
        "Updating existing event: " +
          event.summary +
          (inviteOncallEmail
            ? " adding email invite"
            : " removing email invite")
      );
      if (dryRun) {
        Log.log("Dry run, not updating event");
      } else {
        // Get the Calendar event
        const calendarEvent = CalendarApp.getCalendarById(
          calendarId
        ).getEventById(event.id!);

        // Update transparency to "free"
        const eventId = event.id!;
        const eventJson = {
          transparency: inviteOncallEmail ? "transparent" : "opaque",
        };

        // Update the event with transparency set appropriately
        Calendar.Events?.update(eventJson, calendarId, eventId);

        // Update attendees based on inviteOncallEmail setting
        if (inviteOncallEmail) {
          // Add the oncall person as a guest if not already added
          const email = oncall.user.email;
          if (
            email &&
            !(event.attendees?.some((a) => a.email === email) || false)
          ) {
            calendarEvent.addGuest(email);
            Log.log(`Added guest: ${email} to event`);
          }
        } else {
          // Remove the oncall person as a guest if currently added
          const email = oncall.user.email;
          if (
            email &&
            (event.attendees?.some((a) => a.email === email) || false)
          ) {
            calendarEvent.removeGuest(email);
            Log.log(`Removed guest: ${email} from event`);
          }
        }
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
          event.endDateTime +
          (inviteOncallEmail ? " with email invite" : " without email invite")
      );
      if (dryRun) {
        Log.log("Dry run, not creating event");
      } else {
        // Get the calendar
        const calendar = CalendarApp.getCalendarById(calendarId);

        // Create the event
        const newEvent = calendar.createEvent(
          event.title,
          new Date(event.startDateTime),
          new Date(event.endDateTime)
        );

        // Set the event as "free" instead of "busy" by creating an advanced event JSON
        const eventId = newEvent.getId();
        const eventJson = {
          transparency: inviteOncallEmail ? "transparent" : "opaque",
        };

        // Update the event with transparency set appropriately
        Calendar.Events?.update(eventJson, calendarId, eventId);

        // If inviteOncallEmail is enabled, extract the email from the title and add as attendee
        if (inviteOncallEmail) {
          const email = extractEmail(event.title);
          if (email) {
            newEvent.addGuest(email);
            Log.log(`Added guest: ${email} to event`);
          } else {
            Log.log("Could not extract email from event title");
          }
        }
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
