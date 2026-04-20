import { EventUtil } from "./event-util";
import { CheckTypes } from "./check-types";
import { GetEvents } from "./get-events";
import { ModifyEvent } from "./modify-event";
import { LogLevel, Log } from "./log";
import { Analytics } from "../analytics";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckOOO {
  export const ID = "OutOfOffice";
  export const OutOfOfficeCheck: CheckTypes.CalendarCheck = {
    id: CheckOOO.ID,
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };

  export const OOO_EVENT_TYPE: string = "outOfOffice";
  export const OOO_TITLE_PREFIX_NOTICE: string = "[🚨OOO] ";
  export const OOO_DESCRIPTION_BLURB: string =
    "\n<small><i>[🚨OOO: detected that an attendee is OOO at this time]</i></small>";
  export const OOO_WORKDAY_EVENT_TITLES = [
    "OOO- Automated by Workday",
    "Out of Office",
  ] as const;

  /** Whether a summary matches any known Workday-generated OOO titles */
  export function isWorkdayOOOTitle(title: string | undefined): boolean {
    if (!title) return false;
    const trimmed = title.trim();
    return CheckOOO.OOO_WORKDAY_EVENT_TITLES.some((t) => trimmed === t);
  }

  type CompareEvents = (
    myEvent: GoogleAppsScript.Calendar.Schema.Event,
    theirEvent: GoogleAppsScript.Calendar.Schema.Event
  ) => boolean;

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch,
    checkIsOOOAndOverlaps: CompareEvents = checkIfEventIsOOOAndOverlaps
  ): CheckTypes.ModificationType | undefined {
    if (!EventUtil.isOneOnOneWithMe(event)) {
      Log.log(
        `👎 skipping, doesn't appear to be a 1:1 with me, ${event.summary}`
      );
      return undefined;
    }

    const theirEmail = EventUtil.getEmailForOtherAttendee(event);
    Log.log(
      `Checking OOO for event "${event.summary}", theirEmail = ${theirEmail}`
    );
    if (theirEmail == null) {
      Log.log(`null email, continue`);
      return undefined;
    }

    const start = new Date(event.start!.dateTime!);
    // Handle bug where single day Workday-OOO events are for some reason excluded when making queries within that day
    // Update 1-30-2024 seeing another issue where I even need to go back 2 days to catch the all day event for this day
    // can't explain the jank I'm seeing in the gcal API, but it's harmless to fetch more events, we still
    // do a proper overlap check later regardless.
    start.setDate(start.getDate() - 2);
    const end = new Date(event.end!.dateTime!);
    const theirEventsDuringMeeting = getEvents(
      start,
      end,
      theirEmail,
      undefined,
      undefined,
      undefined
    );
    if (theirEventsDuringMeeting === undefined) {
      Log.log("👮‍♂️ Error fetching their calendar");
      return undefined;
    }

    let hasOOOoverlap = false;
    for (const theirEvent of theirEventsDuringMeeting) {
      if (checkIsOOOAndOverlaps(event, theirEvent)) {
        Log.log("👮‍♂️ Marking event for modification");
        hasOOOoverlap = true;
        break;
      }
    }

    if (hasOOOoverlap) {
      if (
        ModifyEvent.eventLabelOrBlurbNeedsAddingOrTweaking(
          event,
          CheckOOO.OOO_TITLE_PREFIX_NOTICE,
          CheckOOO.OOO_DESCRIPTION_BLURB
        )
      ) {
        Analytics.recordModification(CheckOOO.ID);
        return CheckTypes.ModificationType.YES_ADD_LABEL;
      }
      return undefined;
    } else {
      if (
        ModifyEvent.hasTitleLabelOrDescriptionBlurb(
          event,
          CheckOOO.OOO_TITLE_PREFIX_NOTICE,
          CheckOOO.OOO_DESCRIPTION_BLURB
        )
      ) {
        return CheckTypes.ModificationType.YES_REMOVE_LABEL;
      }

      return undefined;
    }
  }

  export function modifyEventLocally(
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType
  ): CheckTypes.Changelog {
    return [
      ModifyEvent.modifyTitle(
        modificationType,
        event,
        CheckOOO.OOO_TITLE_PREFIX_NOTICE,
        ModifyEvent.Direction.PREFIX
      ),
      ModifyEvent.modifyDescription(
        modificationType,
        event,
        CheckOOO.OOO_DESCRIPTION_BLURB
      ),
    ];
  }

  export function checkIfEventIsOOOAndOverlaps(
    myEvent: GoogleAppsScript.Calendar.Schema.Event,
    theirEvent: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    Log.log(`🔎 Examining their event: 📅 "${theirEvent.summary}"`);
    LogLevel.DEBUG && Log.log(`\\Raw details: "${theirEvent}"`);

    if (
      theirEvent.eventType !== CheckOOO.OOO_EVENT_TYPE &&
      !CheckOOO.isWorkdayOOOTitle(theirEvent.summary)
    ) {
      Log.log(`👎 Not a OOO event,`);
      return false;
    }

    Log.log(`Found potentially relevant OOO event,`);

    // All day event handling
    if (
      theirEvent.start?.date &&
      theirEvent.end?.date &&
      myEvent.start?.dateTime
    ) {
      // For all-day events, we need to compare the dates in the event's timezone
      const myEventDate = new Date(myEvent.start.dateTime);
      const myEventTimezone = myEvent.start.timeZone || 'UTC';
      
      // Convert the date to the event's timezone and get just the date part
      const myEventDateInTimezone = new Date(myEventDate.toLocaleString('en-US', { timeZone: myEventTimezone }));
      myEventDateInTimezone.setHours(0, 0, 0, 0);
      
      // For all-day events, parse the dates directly
      const theirOOOStart = new Date(theirEvent.start.date);
      theirOOOStart.setHours(0, 0, 0, 0);
      
      const theirOOOEnd = new Date(theirEvent.end.date);
      theirOOOEnd.setHours(0, 0, 0, 0);
      // If start and end are the same, treat as a single-day event (inclusive)
      if (theirEvent.start.date === theirEvent.end.date) {
        theirOOOEnd.setDate(theirOOOEnd.getDate()); // no change, inclusive of that day
      } else {
        // Adjust end date to be exclusive (as per Google Calendar's behavior)
        theirOOOEnd.setDate(theirOOOEnd.getDate() - 1);
      }

      // Compare dates in UTC to avoid timezone issues
      const myEventDateUTC = new Date(Date.UTC(
        myEventDateInTimezone.getFullYear(),
        myEventDateInTimezone.getMonth(),
        myEventDateInTimezone.getDate()
      ));
      
      const theirOOOStartUTC = new Date(Date.UTC(
        theirOOOStart.getFullYear(),
        theirOOOStart.getMonth(),
        theirOOOStart.getDate()
      ));
      
      const theirOOOEndUTC = new Date(Date.UTC(
        theirOOOEnd.getFullYear(),
        theirOOOEnd.getMonth(),
        theirOOOEnd.getDate()
      ));

      if (myEventDateUTC <= theirOOOEndUTC && myEventDateUTC >= theirOOOStartUTC) {
        Log.log(
          `✅ Yep, that OOO event overlaps! Will modify and flag the event (all-day event check): oooStart=${theirOOOStartUTC}, oooEnd=${theirOOOEndUTC}, myEventDate=${myEventDateUTC}`
        );
        return true;
      } else {
        Log.log(
          `👎 No, that OOO doesn't appear to overlap (all-day event check): oooStart=${theirOOOStartUTC}, oooEnd=${theirOOOEndUTC}, myEventDate=${myEventDateUTC}`
        );
        return false;
      }
    } 
    // Specific start/end time handling
    else if (
      theirEvent.start?.dateTime &&
      theirEvent.end?.dateTime &&
      myEvent.start?.dateTime &&
      myEvent.end?.dateTime
    ) {
      // Convert all times to UTC for comparison
      const theirOOOStart = new Date(theirEvent.start.dateTime);
      const theirOOOEnd = new Date(theirEvent.end.dateTime);
      const myEventStart = new Date(myEvent.start.dateTime);
      const myEventEnd = new Date(myEvent.end.dateTime);

      // Check if there's any overlap between the events
      if (myEventStart < theirOOOEnd && myEventEnd > theirOOOStart) {
        Log.log(
          "✅ Yep, that OOO event overlaps! Will modify and flag the event"
        );
        return true;
      } else {
        Log.log(
          `👎 No, that OOO doesn't appear to overlap (interval check): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventStart=${myEventStart}, myEventEnd=${myEventEnd}`
        );
        return false;
      }
    }

    Log.log(
      `👎 No, that OOO doesn't appear to overlap (hit edge case where date set strangely...)`
    );
    return false;
  }
}
