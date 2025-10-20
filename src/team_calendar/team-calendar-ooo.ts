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
          (event.eventType === "outOfOffice" ||
          CheckOOO.isWorkdayOOOTitle(event.summary)) &&
          !shouldExcludeOOOEvent(event)
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
      const groupMember = groupMembers.find(
        (member) => member.email === person
      );
      if (groupMember === undefined) {
        return;
      }
      const changes = getChangesPerPerson(
        groupMember,
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

  /**
   * OOO events on someones calendar can have a lot of duplicate / redundant times
   * e.g. a Workday OOO event, plus a manually created OOO all-day event, plus sometimes
   * an short time range OOO event (etc.).
   *
   * The goal here is to output a simplified verison of the events, so that we can represent
   * the OOO as simply as possible on the team calendar.
   */
  export function deduplicatePersonalOOOEvents(
    events: GoogleAppsScript.Calendar.Schema.Event[]
  ): GoogleAppsScript.Calendar.Schema.Event[] {
    // This is a hack to fix a bug where Workday syncs events that start at 10pm and end at 10pm-1min
    // This probably will be fixed on their end but it was bothering me. This code should be cleaned up
    // since its fairly gross.
    const workdaySyncIssueFixedEvents: GoogleAppsScript.Calendar.Schema.Event[] =
      [];
    events.forEach((event) => {
      // Check for the Workday sync issue pattern: events that start at 10pm and end at 10pm-1min
      if (
        isSpecificTimeEvent(event) &&
        event.start?.dateTime &&
        event.end?.dateTime
      ) {
        const startDateTime = event.start.dateTime;
        const endDateTime = event.end.dateTime;

        // Extract just the time portion to check for 22:00:00 pattern
        const startTimePart = startDateTime.split("T")[1];

        // Check if it starts exactly at 10pm (22:00:00)
        if (startTimePart.startsWith("22:00:00")) {
          // Check if end time is 21:59 (regardless of day)
          const endTimePart = endDateTime.split("T")[1];

          if (endTimePart.startsWith("21:59:00")) {
            Log.log(`Found Workday sync issue in event: ${event.summary}`);

            // Extract start date (just the YYYY-MM-DD part, accounting for timezone)
            const startParts = startDateTime.split("T")[0];
            // Adding a day to get the first day of OOO
            const startDateObj = new Date(startParts);
            startDateObj.setDate(startDateObj.getDate() + 1);
            const startDateString = startDateObj.toISOString().split("T")[0];

            // Extract end date (just the YYYY-MM-DD part, accounting for timezone)
            const endParts = endDateTime.split("T")[0];
            // Adding a day to get the last day of OOO plus 1 (exclusive end date)
            const endDateObj = new Date(endParts);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endDateString = endDateObj.toISOString().split("T")[0];

            if (startDateString === undefined || endDateString === undefined) {
              Log.log(
                `Skipping event, inferred startDate or endDate is undefined, this is unexpected`
              );
              return;
            }

            // Create a synthetic all-day event that spans from day after start to day after end
            workdaySyncIssueFixedEvents.push({
              id: event.id + "-workday-fixed",
              start: {
                date: startDateString,
              },
              end: {
                date: endDateString,
              },
              summary: event.summary,
            });

            Log.log(
              `Fixed Workday sync issue: ${startDateString} to ${endDateString}`
            );
          } else {
            // Not matching the specific pattern we're looking for
            workdaySyncIssueFixedEvents.push(event);
          }
        } else {
          // Not starting at 10pm exactly
          workdaySyncIssueFixedEvents.push(event);
        }
      } else {
        // Not a specific time event, add as is
        workdaySyncIssueFixedEvents.push(event);
      }
    });

    const normalizedEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    workdaySyncIssueFixedEvents.forEach((event) => {
      // OOO holds are always at midnight in the creator's timezone, but practically speaking they just
      // created the all day event, it's not useful to set it midnight to midnight (which will show on
      // the previous/next day for folks in other timezones). So catch those cases and convert them
      // to all day events instead.
      //
      // For specific time OOO events that are not midnight to midnight, we'll show them normally.
      // This is useful for something like a 3 hour OOO afternoon.
      
      // First check for near-24-hour events that should be treated as all-day
      // This handles DST-affected events that are 23 or 25 hours instead of exactly 24
      if (
        isSpecificTimeEvent(event) &&
        event.start?.dateTime &&
        event.end?.dateTime
      ) {
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        
        // Check if duration is close to 24 hours (between 23 and 25 hours to account for DST)
        if (durationHours >= 23 && durationHours <= 25) {
          Log.log(
            `Found near-24-hour OOO event (${durationHours.toFixed(2)} hours): ${event.summary} from ${JSON.stringify(event.start)} to ${JSON.stringify(event.end)}`
          );
          Log.log(
            `Going to represent this as an all day event when calculating changes`
          );
          const startDate = getDateStringFromEvent(event.start!);
          const endDate = getDateStringFromEvent(event.end!);
          if (startDate === undefined || endDate === undefined) {
            Log.log(
              `Skipping event, inferred startDate or endDate is undefined, this is unexpected`
            );
            return;
          }

          // Calculate the end date as start date + 1 for single-day events
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          
          // If start and end are the same day, make it a single-day all-day event
          let finalEndDate = endDate;
          if (startDate === endDate) {
            startDateObj.setDate(startDateObj.getDate() + 1);
            finalEndDate = startDateObj.toISOString().split("T")[0];
          }

          normalizedEvents.push({
            id: event.id + "-near24h-synthetic",
            start: { date: startDate },
            end: { date: finalEndDate },
            summary: `Synthetic event created for ${event.id} which is a near-24-hour OOO event`,
          });
          return;
        }
      }
      
      // Then check for exact midnight-to-midnight events
      if (
        isSpecificTimeEvent(event) &&
        isMidnight(event.start!) &&
        isMidnight(event.end!)
      ) {
        Log.log(
          `Found Midnight to midnight OOO event: ${event.summary} from ${JSON.stringify(event.start)} to ${JSON.stringify(event.end)}`
        );
        Log.log(
          `Going to represent this as an all day event when calculating changes`
        );
        const startDate = getDateStringFromEvent(event.start!);
        const endDate = getDateStringFromEvent(event.end!);
        if (startDate === undefined || endDate === undefined) {
          Log.log(
            `Skipping event, inferred startDate or endDate is undefined, this is unexpected `
          );
          return;
        }

        normalizedEvents.push({
          id: event.id + "-synthetic",
          start: { date: startDate },
          end: { date: endDate },
          summary: `Synthetic event created for ${event.id} which is a midnight to midnight OOO event`,
        });
        // Workday creates events where start==end, but the normal practice is even for 1 day events
        // that end = start +1. So synthetically "normalize" this to make downstream logic easier.
      } else if (
        isAllDayEvent(event) &&
        event.start?.date === event.end?.date
      ) {
        // Handle all day events where start == end
        // Create a synthetic event where end = start + 1 day
        Log.log(
          `Found all day event with same start and end date: ${event.summary} on ${event.start?.date}`
        );
        Log.log(`Creating synthetic event with end date = start date + 1 day`);

        const startDate = event.start?.date;
        if (startDate === undefined) {
          Log.log(
            `Skipping event, start date is undefined, this is unexpected`
          );
          return;
        }

        // Calculate end date as start date + 1 day
        const endDateObj = new Date(startDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endDate = endDateObj.toISOString().split("T")[0]; // Format as YYYY-MM-DD

        normalizedEvents.push({
          id: event.id + "-synthetic",
          start: { date: startDate },
          end: { date: endDate },
          summary: event.summary,
        });
      } else {
        normalizedEvents.push(event);
      }
    });

    // first, remove any events that an exact match in terms of start/end
    // cover the case where a single day event has start==end or end=start+1 (those should be deduplicated)
    const deduplicatedEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    normalizedEvents.forEach((event) => {
      // Check if this event is already in our deduplicated list
      const isDuplicate = deduplicatedEvents.some((existingEvent) => {
        // For all-day events
        if (isAllDayEvent(event) && isAllDayEvent(existingEvent)) {
          return (
            event.start?.date === existingEvent.start?.date &&
            event.end?.date === existingEvent.end?.date
          );
        }
        // For specific time events
        else if (
          isSpecificTimeEvent(event) &&
          isSpecificTimeEvent(existingEvent)
        ) {
          return (
            event.start?.dateTime === existingEvent.start?.dateTime &&
            event.end?.dateTime === existingEvent.end?.dateTime
          );
        }
        return false;
      });

      if (!isDuplicate) {
        deduplicatedEvents.push(event);
      } else {
        Log.log(`Skipping duplicate event: ${event.summary}`);
      }
    });

    // First, sort events by duration (longest first) to ensure larger events are processed first
    const sortedEvents = [...deduplicatedEvents].sort((a, b) => {
      // Calculate duration for event A
      let durationA: number;
      if (isAllDayEvent(a)) {
        const startA = new Date(a.start!.date!);
        const endA = new Date(a.end!.date!);
        durationA = endA.getTime() - startA.getTime();
      } else if (isSpecificTimeEvent(a)) {
        const startA = new Date(a.start!.dateTime!);
        const endA = new Date(a.end!.dateTime!);
        durationA = endA.getTime() - startA.getTime();
      } else {
        durationA = 0;
      }

      // Calculate duration for event B
      let durationB: number;
      if (isAllDayEvent(b)) {
        const startB = new Date(b.start!.date!);
        const endB = new Date(b.end!.date!);
        durationB = endB.getTime() - startB.getTime();
      } else if (isSpecificTimeEvent(b)) {
        const startB = new Date(b.start!.dateTime!);
        const endB = new Date(b.end!.dateTime!);
        durationB = endB.getTime() - startB.getTime();
      } else {
        durationB = 0;
      }

      // Sort by duration (descending)
      return durationB - durationA;
    });

    const nonRedundantEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    const isRedundantMap = new Map<string, boolean>();

    // First pass: determine which events are redundant
    sortedEvents.forEach((currentEvent) => {
      // Skip if already marked as redundant
      if (isRedundantMap.get(currentEvent.id!)) {
        return;
      }

      for (const otherEvent of sortedEvents) {
        // Skip comparing with itself or already redundant events
        if (currentEvent === otherEvent || isRedundantMap.get(otherEvent.id!)) {
          continue;
        }

        // Case 1: All-day event encompassed by another all-day event
        if (isAllDayEvent(currentEvent) && isAllDayEvent(otherEvent)) {
          const currentStart = new Date(currentEvent.start!.date!);
          const currentEnd = new Date(currentEvent.end!.date!);
          const otherStart = new Date(otherEvent.start!.date!);
          const otherEnd = new Date(otherEvent.end!.date!);

          if (currentStart >= otherStart && currentEnd <= otherEnd) {
            isRedundantMap.set(currentEvent.id!, true);
            break;
          }
        }

        // Case 2: Time range event encompassed by another time range event
        else if (
          isSpecificTimeEvent(currentEvent) &&
          isSpecificTimeEvent(otherEvent)
        ) {
          const currentStart = new Date(currentEvent.start!.dateTime!);
          const currentEnd = new Date(currentEvent.end!.dateTime!);
          const otherStart = new Date(otherEvent.start!.dateTime!);
          const otherEnd = new Date(otherEvent.end!.dateTime!);

          if (currentStart >= otherStart && currentEnd <= otherEnd) {
            isRedundantMap.set(currentEvent.id!, true);
            break;
          }
        }

        // Case 3: Time range event that is a subset of an all-day event (if ≥ 4 hours)
        else if (
          isSpecificTimeEvent(currentEvent) &&
          isAllDayEvent(otherEvent)
        ) {
          const currentStart = new Date(currentEvent.start!.dateTime!);
          const currentEnd = new Date(currentEvent.end!.dateTime!);
          const otherStart = new Date(otherEvent.start!.date!);
          const otherEnd = new Date(otherEvent.end!.date!);

          // Calculate duration in hours
          const durationMs = currentEnd.getTime() - currentStart.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          if (durationHours >= 4) {
            if (currentStart >= otherStart && currentEnd <= otherEnd) {
              isRedundantMap.set(currentEvent.id!, true);
              break;
            }
          }
        }

        // Case 4: All-day event that is a subset of a time range event
        else if (
          isAllDayEvent(currentEvent) &&
          isSpecificTimeEvent(otherEvent)
        ) {
          const currentStart = new Date(currentEvent.start!.date!);
          const currentEnd = new Date(currentEvent.end!.date!);
          const otherStart = new Date(otherEvent.start!.dateTime!);
          const otherEnd = new Date(otherEvent.end!.dateTime!);

          // Get the date parts of the time range event
          const otherStartDay = new Date(otherStart);
          otherStartDay.setHours(0, 0, 0, 0);

          const otherEndDay = new Date(otherEnd);
          otherEndDay.setHours(0, 0, 0, 0);

          // Calculate duration in hours
          const durationMs = otherEnd.getTime() - otherStart.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          // Check if time range event is ≥ 24 hours and encompasses the all-day event
          if (
            durationHours >= 24 &&
            currentStart >= otherStartDay &&
            currentEnd <= otherEndDay
          ) {
            isRedundantMap.set(currentEvent.id!, true);
            break;
          }
        }
      }
    });

    // Second pass: collect non-redundant events
    sortedEvents.forEach((event) => {
      if (!isRedundantMap.get(event.id!)) {
        nonRedundantEvents.push(event);
      } else {
        Log.log(`Skipping redundant event: ${event.summary}`);
      }
    });

    return nonRedundantEvents;
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
    const eventsMayNeedToCreate: GoogleAppsScript.Calendar.Schema.Event[] =
      deduplicatePersonalOOOEvents(oooEvents);

    teamCalendarOOOEvents.forEach((teamCalendarOOOEvent) => {
      Log.log(
        `Examing team calendar OOO event: ${teamCalendarOOOEvent.summary} ${JSON.stringify(teamCalendarOOOEvent.start)} to ${JSON.stringify(teamCalendarOOOEvent.end)}`
      );

      // Find the first matching event instead of all matching events
      const matchingEventIndex = eventsMayNeedToCreate.findIndex((event) => {
        // Pretty gross logic. Sometimes single day events have start==end. Sometimes
        // they have end==start +1. Idk.
        if (
          isAllDayEvent(event) &&
          isAllDayEvent(teamCalendarOOOEvent) &&
          event.start!.date! === teamCalendarOOOEvent.start!.date! &&
          event.end!.date! === teamCalendarOOOEvent.end!.date!
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

      if (matchingEventIndex !== -1) {
        const [matchingEvent] = eventsMayNeedToCreate.splice(
          matchingEventIndex,
          1
        );
        Log.log(`Found matching event in team calendar for ${person.email}`);
        Log.log(
          `Matched: ${matchingEvent.summary} from ${JSON.stringify(matchingEvent.start)} to ${JSON.stringify(matchingEvent.end)}`
        );
      } else {
        Log.log(`No matching, flagging for deletion`);
        deleteEvents.push(teamCalendarOOOEvent);
      }
    });

    // Remaining events did not match anything already on the team calendar
    const eventsWithNoTeamCalendarMatch = eventsMayNeedToCreate;

    const newAllDayEvents: { start: string; end: string; title: string }[] = [];
    const newTimeRangeEvents: {
      startDateTime: string;
      endDateTime: string;
      title: string;
    }[] = [];

    eventsWithNoTeamCalendarMatch.forEach((event) => {
      if (isAllDayEvent(event)) {
        newAllDayEvents.push({
          start: event.start!.date!,
          end: event.end!.date!,
          title: createEventTitle(person.name, person.email),
        });
      } else if (isSpecificTimeEvent(event)) {
        newTimeRangeEvents.push({
          startDateTime: event.start!.dateTime!,
          endDateTime: event.end!.dateTime!,
          title: createEventTitle(person.name, person.email),
        });
      }
    });

    return {
      deleteEvents: deleteEvents,
      newAllDayEvents: newAllDayEvents,
      newTimeRangeEvents: newTimeRangeEvents,
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

  export function shouldExcludeOOOEvent(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    if (!event.summary) {
      return false;
    }
    
    const lowerTitle = event.summary.toLowerCase();
    const excludeKeywords = ["sleep", "hours"];
    
    return excludeKeywords.some(keyword => lowerTitle.includes(keyword));
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

  /**
   * Checks if a Google Calendar event time represents midnight in its timezone.
   * Works by directly examining the time portion of the dateTime string.
   *
   * @param eventTime The event time object from Google Calendar API
   * @returns True if the time is exactly midnight (00:00:00), false otherwise
   */
  export function isMidnight(eventTime: {
    dateTime?: string;
    timeZone?: string;
  }): boolean {
    // Return false if dateTime is missing
    if (!eventTime?.dateTime) {
      return false;
    }

    // Split the dateTime string at 'T' to get the time portion
    const timeString = eventTime.dateTime.split("T")[1];

    // Get just the time portion by removing anything after a '+', '-', or 'Z'
    // Make sure to handle the case where 'Z' might be included in timePortion
    let timePortion = timeString.split(/[+-]/)[0];
    if (timePortion.endsWith("Z")) {
      timePortion = timePortion.slice(0, -1);
    }

    // Check if the time is exactly midnight (00:00:00)
    return timePortion === "00:00:00";
  }

  /**
   * Extracts the date in "YYYY-MM-DD" format from an event object
   * based on its dateTime and timeZone.
   * @param eventStart - The event object with dateTime and timeZone.
   * @returns The formatted date string, or null if dateTime or timeZone is missing.
   */
  export function getDateStringFromEvent(eventStart: {
    date?: string | undefined;
    dateTime?: string | undefined;
    timeZone?: string | undefined;
  }): string | undefined {
    if (
      eventStart.dateTime === undefined ||
      eventStart.timeZone === undefined
    ) {
      return undefined;
    }

    // Parse the event's dateTime into a Date object.
    const eventDate: Date = new Date(eventStart.dateTime);

    // Create a formatter to get year, month, and day parts.
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: eventStart.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Use formatToParts to extract individual components.
    const parts = formatter.formatToParts(eventDate);
    let year = "";
    let month = "";
    let day = "";

    for (const part of parts) {
      if (part.type === "year") {
        year = part.value;
      } else if (part.type === "month") {
        month = part.value;
      } else if (part.type === "day") {
        day = part.value;
      }
    }

    return `${year}-${month}-${day}`;
  }
}
