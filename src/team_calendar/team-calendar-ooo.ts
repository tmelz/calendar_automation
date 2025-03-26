import { CheckOOO } from "../checks/check-ooo";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";
import { EventUtil } from "../checks/event-util";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TeamCalendarOOO {
  export type GroupMember = {
    email: string;
    name: string | undefined;
  };

  export type CalendarChanges = {
    deleteEvents: GoogleAppsScript.Calendar.Schema.Event[];
    newAllDayEvents: { start: string; end: string; title: string }[];
    newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[];
  };

  export function syncCalendarOOO(
    timeMinInput: Date,
    timeMax: Date,
    calendarId: string,
    groupEmail: string,
    dryRun: boolean = false
  ): void {
    Log.logPhase(`Running for calendar: ${calendarId}, group: ${groupEmail}`);

    const eventsToDelete: GoogleAppsScript.Calendar.Schema.Event[] = [];
    // Subtract 1 day from timeMin, helps with Gcal off by one issues
    // (all day events for today are not returned if you query mid-day)
    const timeMin = new Date(timeMinInput.getTime() - 1 * 24 * 60 * 60 * 1000);

    // get all people for that group
    const groupMembers: GroupMember[] = GroupsApp.getGroupByEmail(groupEmail)
      .getUsers()
      .map((user) => {
        return {
          email: user.getEmail(),
          name: getNameByEmail(user.getEmail()),
        };
      });
    Log.log(`Group members: ${JSON.stringify(groupMembers)}}`);

    // get all events for those people
    const memberEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]> =
      new Map();
    groupMembers.forEach((member) => {
      const oooEvents = GetEvents.getEventsForDateRangeCustomCalendar(
        timeMin,
        timeMax,
        member.email
      ).filter(
        (event) =>
          event.eventType === "outOfOffice" ||
          event.summary === CheckOOO.OOO_WORKDAY_EVENT_TITLE
      );
      memberEvents.set(member.email, oooEvents);
    });

    // get events for that group calendar
    //    categorize by person
    //    if matches pattern but cant get person, flag for delete
    const teamCalendarOOOEvents = GetEvents.getEventsForDateRangeCustomCalendar(
      timeMin,
      timeMax,
      calendarId
    ).filter((event) => isOOOEventOnTeamCalendar(event));
    const memberEventsFromTeamCalendar: Map<
      string,
      GoogleAppsScript.Calendar.Schema.Event[]
    > = new Map();
    teamCalendarOOOEvents.forEach((event) => {
      Log.log(
        `Processing event: ${event.summary} for ${JSON.stringify(event.start)} to ${JSON.stringify(event.end)}`
      );
      const email = extractEmail(event.summary);
      if (email === undefined) {
        Log.log(
          `No email found in event: ${event.summary}, flagging for deletion`
        );
        eventsToDelete.push(event);
        return;
      }
      if (!memberEventsFromTeamCalendar.has(email)) {
        memberEventsFromTeamCalendar.set(email, []);
      }
      Log.log(`Parsed as event for email ${email}`);
      memberEventsFromTeamCalendar.get(email)?.push(event);
    });

    const changes: CalendarChanges = getCalendarChanges(
      groupMembers,
      memberEvents,
      memberEventsFromTeamCalendar
    );
    changes.deleteEvents.push(...eventsToDelete);

    makeChanges(calendarId, changes, dryRun);
  }

  export function getCalendarChanges(
    groupMembers: GroupMember[],
    memberEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>,
    teamCalendarOOOEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>
  ): CalendarChanges {
    const deleteEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const newAllDayEvents: { start: string; end: string; title: string }[] = [];
    const newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[] = [];

    const allPeopleToConsider = new Set([
      ...memberEvents.keys(),
      ...teamCalendarOOOEvents.keys(),
    ]);
    allPeopleToConsider.forEach((person) => {
      const changes = getChangesPerPerson(
        groupMembers.find((member) => member.email === person)!,
        teamCalendarOOOEvents.get(person) ?? [],
        memberEvents.get(person) ?? []
      );

      deleteEvents.push(...changes.deleteEvents);
      newAllDayEvents.push(...changes.newAllDayEvents);
      newTimeRangeEvents.push(...changes.newTimeRangeEvents);
    });

    return {
      deleteEvents: deleteEvents,
      newAllDayEvents,
      newTimeRangeEvents,
    };
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
      if (!isOOOEventOnTeamCalendar(event)) {
        throw new Error("invariant violation: deleting non-OOO event");
      }
      if (dryRun) {
        Log.log("Dry run, not deleting event");
      } else {
        CalendarApp.getCalendarById(calendarId)
          .getEventById(event.id!)
          .deleteEvent();
      }
    });

    Log.log(`Creating new all day events:`);
    changes.newAllDayEvents.forEach((event) => {
      const startDate = getAllDayDate(event.start);
      const endDate = getAllDayDate(event.end);

      Log.log(
        `Creating new all day event: ${event.title} from ${startDate} to ${endDate}`
      );

      if (dryRun) {
        Log.log("Dry run, not creating event");
      } else {
        if (event.start === event.end) {
          CalendarApp.getCalendarById(calendarId).createAllDayEvent(
            event.title,
            startDate
          );
        } else {
          CalendarApp.getCalendarById(calendarId).createAllDayEvent(
            event.title,
            startDate,
            endDate
          );
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

  export function getChangesPerPerson(
    person: GroupMember,
    teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[],
    oooEvents: GoogleAppsScript.Calendar.Schema.Event[]
  ): CalendarChanges {
    const deleteEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];

    Log.log(
      `Determining team-calendar-OOO changes to make for ${person.email}`
    );
    Log.log(`Their existing team calendar OOO events:`);
    teamCalendarOOOEvents.forEach((event) => {
      Log.log(
        `\t- ${event.summary} for ${JSON.stringify(event.start)} to ${JSON.stringify(event.end)}`
      );
    });
    Log.log(`Their OOO events from their own calendar:`);
    oooEvents.forEach((event) => {
      Log.log(
        `\t- ${event.summary} for ${JSON.stringify(event.start)} to ${JSON.stringify(event.end)}`
      );
    });

    // clone oooEvents
    const eventsMayNeedToCreate = [...oooEvents];

    teamCalendarOOOEvents.forEach((teamCalendarOOOEvent) => {
      Log.log(
        `Examing team calendar OOO event: ${teamCalendarOOOEvent.summary} ${JSON.stringify(teamCalendarOOOEvent.start)} to ${JSON.stringify(teamCalendarOOOEvent.end)}`
      );
      const matchingEvent = eventsMayNeedToCreate.find((event) => {
        // Pretty gross logic. Sometimes single day events have start==end. Sometimes
        // they have end==start +1. Idk.
        if (
          isAllDayEvent(event) &&
          isAllDayEvent(teamCalendarOOOEvent) &&
          // Check if start === start
          event.start!.date! === teamCalendarOOOEvent.start!.date! &&
          // check if end == end OR (if the event is a start==end event AND the team event is the proper end=start+1)
          (event.end!.date! === teamCalendarOOOEvent.end!.date! ||
            (event.start!.date! === event.end!.date! &&
              Math.abs(
                new Date(event.end!.date!).getTime() -
                  new Date(teamCalendarOOOEvent.end!.date!).getTime()
              ) <=
                1000 * 60 * 60 * 24))
        ) {
          return true;
        }

        // ugly but im not confident the two dateTime strings are in the same timezone
        if (
          isSpecificTimeEvent(event) &&
          isSpecificTimeEvent(teamCalendarOOOEvent) &&
          new Date(event.start!.dateTime!).getTime() ===
            new Date(teamCalendarOOOEvent.start!.dateTime!).getTime() &&
          new Date(event.end!.dateTime!).getTime() ===
            new Date(teamCalendarOOOEvent.end!.dateTime!).getTime()
        ) {
          return true;
        }

        return false;
      });

      if (matchingEvent !== undefined) {
        Log.log(
          `Found matching event in team calendar for ${person.email}: ${matchingEvent.summary} from ${JSON.stringify(matchingEvent.start)} to ${JSON.stringify(matchingEvent.end)}`
        );
        eventsMayNeedToCreate.splice(
          eventsMayNeedToCreate.indexOf(matchingEvent),
          1
        );
      } else {
        Log.log(`No matching, flagging for deletion`);
        deleteEvents.push(teamCalendarOOOEvent);
      }
    });

    const uniqueAllDayEvents = new Map<
      string,
      { start: string; end: string; title: string }
    >();
    const uniqueTimeRangeEvents = new Map<
      string,
      { startDateTime: string; endDateTime: string; title: string }
    >();

    eventsMayNeedToCreate.forEach((event) => {
      if (isAllDayEvent(event)) {
        const key = `${event.start!.date!}-${event.end!.date!}-${person.email}`;
        if (!uniqueAllDayEvents.has(key)) {
          uniqueAllDayEvents.set(key, {
            start: event.start!.date!,
            end: event.end!.date!,
            title: createEventTitle(person.name, person.email),
          });
        }
      } else if (isSpecificTimeEvent(event)) {
        const key = `${event.start!.dateTime!}-${event.end!.dateTime!}-${person.email}`;
        if (!uniqueTimeRangeEvents.has(key)) {
          uniqueTimeRangeEvents.set(key, {
            startDateTime: event.start!.dateTime!,
            endDateTime: event.end!.dateTime!,
            title: createEventTitle(person.name, person.email),
          });
        }
      }
    });

    // Check for all day events that are subsets of other all day events
    const filteredAllDayEvents = Array.from(uniqueAllDayEvents.values()).filter(
      (event, index, self) =>
        !self.some(
          (otherEvent) =>
            otherEvent !== event &&
            new Date(event.start) >= new Date(otherEvent.start) &&
            new Date(event.end) <= new Date(otherEvent.end)
        )
    );

    // Check for time range events 8 hours or longer that are subsets of all day events
    const filteredTimeRangeEvents = Array.from(
      uniqueTimeRangeEvents.values()
    ).filter((timeEvent) => {
      const startTime = new Date(timeEvent.startDateTime);
      const endTime = new Date(timeEvent.endDateTime);
      const durationHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      // If duration is less than 8 hours, keep the event
      if (durationHours < 8) {
        return true;
      }

      // Check if this time range event is a subset of any all day event
      return !filteredAllDayEvents.some((allDayEvent) => {
        const allDayStart = new Date(allDayEvent.start);
        let allDayEnd = new Date(allDayEvent.end);

        // If allDayStart is the same as allDayEnd, add 24 hours to all day end date
        if (allDayStart.getTime() === allDayEnd.getTime()) {
          allDayEnd = new Date(allDayEnd.getTime() + 24 * 60 * 60 * 1000);
        }

        return startTime >= allDayStart && endTime <= allDayEnd;
      });
    });

    // Check for all day events that may be subsets of time range events >= 24 hours
    const finalAllDayEvents = filteredAllDayEvents.filter((allDayEvent) => {
      const allDayStart = new Date(allDayEvent.start);
      let allDayEnd = new Date(allDayEvent.end);

      // If allDayStart is the same as allDayEnd, add 24 hours to all day end date
      if (allDayStart.getTime() === allDayEnd.getTime()) {
        allDayEnd = new Date(allDayEnd.getTime() + 24 * 60 * 60 * 1000);
      }

      return !Array.from(uniqueTimeRangeEvents.values()).some((timeEvent) => {
        const startTime = new Date(timeEvent.startDateTime);
        const endTime = new Date(timeEvent.endDateTime);
        const durationHours =
          (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        // Only consider time range events >= 24 hours
        return (
          durationHours >= 24 &&
          allDayStart >= startTime &&
          allDayEnd <= endTime
        );
      });
    });

    return {
      deleteEvents: deleteEvents,
      newAllDayEvents: finalAllDayEvents,
      newTimeRangeEvents: filteredTimeRangeEvents,
    };
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
    personName: string | undefined,
    email: string
  ): string {
    if (personName === undefined) {
      return `[OOO] ${email}`;
    } else {
      return `[OOO] ${personName} (${email})`;
    }
  }

  export function isOOOEventOnTeamCalendar(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    return (
      (event.summary?.startsWith("[OOO]") ?? false) &&
      event.eventType === "default" &&
      event.attendees === undefined &&
      event.conferenceData === undefined
    );
  }

  export function getNameByEmail(email: string): string | undefined {
    Log.log("Looking up name for email: " + email);
    const cache = CacheService.getUserCache();
    const cachedName = cache.get("getName_v3_" + email);

    if (cachedName !== null && cachedName?.trim().length > 0) {
      Logger.log(`Cache hit getting name for email: ${email}`);
      return cachedName;
    }

    let fullname: string | undefined;
    try {
      const result = AdminDirectory.Users?.get(email, {
        fields: "name",
        viewType: "domain_public",
      });
      fullname = result?.name?.fullName;
    } catch (error) {
      Logger.log(
        "Error fetching user details for email: " + email + ", error: " + error
      );
      fullname = undefined;
    }

    if (fullname !== undefined) {
      Logger.log("Got name: " + fullname);
    } else {
      Logger.log("No name found for email: " + email);
    }

    if (fullname !== undefined) {
      cache.put("getName_v3_" + email, fullname, 60 * 60 * 24 * 30); // Cache for 30 days
    }

    return fullname;
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

  function getAllDayDate(date: string): Date {
    // so many weird timezone issues with just passing new Date(date)
    // into the gcal API, this workaround seems to work, too lazy to
    // fully debug why. the error for that is that it creates for the day before
    // seems safe we can assume the format is YYYY-MM-DD
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
}
