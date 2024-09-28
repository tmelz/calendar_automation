import { CheckOOO } from "../checks/check-ooo";
import { GetEvents } from "../checks/get-events";
import { Log } from "../checks/log";

// TODO
// itereate on way to fetch peoples names, why is it empty for so many when clearly they have names submitted
// figure out more elegant solution to off by one error in all day events

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TeamCalendarOOO {
  export type GroupMember = {
    email: string;
    name: string | undefined;
  };

  export type CalendarChanges = {
    deleteEventsIds: string[];
    newAllDayEvents: { start: string; end: string; title: string }[];
    newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[];
  };

  export function syncCalendarOOO(
    timeMin: Date,
    timeMax: Date,
    calendarId: string,
    groupEmail: string
  ): void {
    Log.logPhase(`Running for calendar: ${calendarId}, group: ${groupEmail}`);

    const eventIdsToDelete: string[] = [];

    // get all people for that group
    const groupMembers: GroupMember[] = GroupsApp.getGroupByEmail(groupEmail)
      .getUsers()
      .map((user) => {
        return {
          email: user.getEmail(),
          name: getNameByEmailAcrossBlockDomains(user.getEmail()),
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
    ).filter((event) => isOOOEventOnTeamCalendar(event.summary));
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
        eventIdsToDelete.push(event.id!);
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
    changes.deleteEventsIds.push(...eventIdsToDelete);

    makeChanges(calendarId, changes);
  }

  export function getCalendarChanges(
    groupMembers: GroupMember[],
    memberEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>,
    teamCalendarOOOEvents: Map<string, GoogleAppsScript.Calendar.Schema.Event[]>
  ): CalendarChanges {
    const deleteEventsIds: string[] = [];
    const newAllDayEvents: { start: string; end: string; title: string }[] = [];
    const newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[] = [];

    // get union of keys from memberEvents and memberEventsFromTeamCalendar
    // TODO handle block vs squareup
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

      deleteEventsIds.push(...changes.deleteEventsIds);
      newAllDayEvents.push(...changes.newAllDayEvents);
      newTimeRangeEvents.push(...changes.newTimeRangeEvents);
    });

    return {
      deleteEventsIds,
      newAllDayEvents,
      newTimeRangeEvents,
    };
  }

  export function makeChanges(
    calendarId: string,
    changes: CalendarChanges
  ): void {
    Log.log(`Making changes for calendar: ${calendarId}`);
    Log.log(`Deleting events: ${changes.deleteEventsIds}`);
    changes.deleteEventsIds.forEach((eventId) => {
      Log.log(`Deleting event: ${eventId}`);
      CalendarApp.getCalendarById(calendarId)
        .getEventById(eventId)
        .deleteEvent();
    });

    Log.log(`Creating new all day events:`);
    changes.newAllDayEvents.forEach((event) => {
      const startDate = getAllDayDate(event.start);
      const endDate = getAllDayDate(event.end);

      Log.log(
        `Creating new all day event: ${event.title} from ${startDate} to ${endDate}`
      );

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
      CalendarApp.getCalendarById(calendarId).createEvent(
        event.title,
        new Date(event.startDateTime),
        new Date(event.endDateTime)
      );
    });
  }

  export function getChangesPerPerson(
    person: GroupMember,
    teamCalendarOOOEvents: GoogleAppsScript.Calendar.Schema.Event[],
    oooEvents: GoogleAppsScript.Calendar.Schema.Event[]
  ): CalendarChanges {
    const deleteEventsIds: string[] = [];

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
        deleteEventsIds.push(teamCalendarOOOEvent.id!);
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

    return {
      deleteEventsIds,
      newAllDayEvents: filteredAllDayEvents,
      newTimeRangeEvents: Array.from(uniqueTimeRangeEvents.values()),
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
    eventTitle: string | undefined
  ): boolean {
    return eventTitle?.startsWith("[OOO]") ?? false;
  }

  export function getNameByEmail(email: string): string | undefined {
    Log.log("Looking up name for email: " + email);
    const contacts = ContactsApp.getContactsByEmailAddress(email);

    if (contacts.length > 0) {
      // Get the first contact (assuming there's only one with that email)
      const contact = contacts[0];
      const name = contact.getFullName();

      Logger.log("Got name: " + (name ?? "undefined"));
      return name;
    } else {
      Logger.log("No contact found with email: " + email);
      return undefined;
    }
  }

  export function getNameByEmailAcrossBlockDomains(
    email: string
  ): string | undefined {
    const cache = CacheService.getUserCache();
    const cachedName = cache.get("getName_v2_" + email);

    if (cachedName !== null && cachedName?.trim().length > 0) {
      Logger.log(`Cache hit getting name for email: ${email}`);
      return cachedName;
    }

    Logger.log(`Cache miss getting name for email: ${email}`);
    let name = getNameByEmail(email);

    if (
      (name === undefined || name.trim().length === 0 || name.includes("@")) &&
      email.endsWith("@block.xyz")
    ) {
      Log.log(
        `No name found for ${email}, trying @squareup domain instead, that sometimes works`
      );

      const squareupEmail = email.replace("@block.xyz", "@squareup.com");
      name = getNameByEmail(squareupEmail);
    }

    if (name !== undefined) {
      cache.put("getName_v2_" + email, name, 60 * 60 * 24 * 30); // Cache for 30 days
    }

    return name;
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
