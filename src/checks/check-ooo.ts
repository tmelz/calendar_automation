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
  export const OOO_WORKDAY_EVENT_TITLE: string = "OOO- Automated by Workday";

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
      Log.log(`👎 skipping, doesn't appear to be a 1:1 with me, ${event}`);
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
    start.setDate(start.getDate() - 1);
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
      theirEvent.summary !== CheckOOO.OOO_WORKDAY_EVENT_TITLE
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
      const myEventDate = new Date(myEvent.start.dateTime);
      Log.log(`Debug: myEventDate=${myEventDate}`);
      myEventDate.setHours(0, 0, 0, 0);
      // Ugh this was annoying and janky but it works :shrug:. Basically these values are simple dates like "09-03-2023", but
      // javascript will interpret them as UTC and subtract 7 hours from pacific, so effectively the dates are -1.
      // Ugly hack for that is add back the delta between UTC and current timezone. Probably a much better way but this seems
      // stable and I'm lazy and don't want to spend too much time on this.
      const theirOOOStart = new Date(theirEvent.start.date);
      theirOOOStart.setMinutes(
        theirOOOStart.getMinutes() + theirOOOStart.getTimezoneOffset()
      );
      Log.log(`Debug: theirOOOStart=${theirOOOStart}`);
      theirOOOStart.setHours(0, 0, 0, 0);
      const theirOOOEnd = new Date(theirEvent.end.date);
      theirOOOEnd.setMinutes(
        theirOOOEnd.getMinutes() + theirOOOEnd.getTimezoneOffset()
      );
      Log.log(`Debug: theirOOOEnd=${theirOOOEnd}`);
      theirOOOEnd.setHours(0, 0, 0, 0);

      if (myEventDate <= theirOOOEnd && myEventDate >= theirOOOStart) {
        Log.log(
          `✅ Yep, that OOO event overlaps! Will modify and flag the even (only date check, not mins/hours): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventDate=${myEventDate}`
        );

        return true;
      } else {
        Log.log(
          `👎 No, that OOO doensnt appear to overlap (only date check, not mins/hours): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventDate=${myEventDate}`
        );
        return false;
      }
      // Specific start/end time handling
    } else if (
      theirEvent.start?.dateTime &&
      theirEvent.end?.dateTime &&
      myEvent.start?.dateTime &&
      myEvent.end?.dateTime
    ) {
      const theirOOOStart = new Date(theirEvent.start.dateTime);
      const theirOOOEnd = new Date(theirEvent.end.dateTime);

      const myEventStart = new Date(myEvent.start.dateTime);
      const myEventEnd = new Date(myEvent.end.dateTime);

      if (myEventStart >= theirOOOStart && myEventEnd <= theirOOOEnd) {
        Log.log(
          "✅ Yep, that OOO event overlaps! Will modify and flag the event"
        );
        return true;
      } else {
        Log.log(
          `👎 No, that OOO doensnt appear to overlap (interval check): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventStart=${myEventStart}, myEventEnd=${myEventEnd}`
        );
        return false;
      }
    }

    Log.log(
      `👎 No, that OOO doensnt appear to overlap (hit edge case where date set strangely...)`
    );
    return false;
  }
}
