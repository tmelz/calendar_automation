import { EventUtil } from "./event-util";
import { CheckTypes } from "./check-types";
import { GetEvents } from "./get-events";
import { ModifyEvent } from "./modify-event";
import { LogLevel, Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckConflict {
  export const ConflictCheck: CheckTypes.CalendarCheck = {
    id: "Conflict",
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };

  export const CONFLICT_TITLE_PREFIX_NOTICE: string = "[🕰️⚔️] ";
  export const CONFLICT_DESCRIPTION_BLURB: string =
    "\n<small><i>[🕰️⚔️: detected that an attendee is RSVPd to another event at this time]</i></small>";

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): CheckTypes.ModificationType | undefined {
    if (
      event.start?.dateTime === undefined ||
      event.end?.dateTime === undefined
    ) {
      return undefined;
    }
    const threeHours = 3 * 60 * 60 * 1000;
    const relevantStartWindow = new Date(event.start.dateTime);
    relevantStartWindow.setTime(relevantStartWindow.getTime() - threeHours);

    const relevantEndWindow = new Date(event.end.dateTime);
    relevantEndWindow.setTime(relevantEndWindow.getTime() + threeHours);

    const nearbyEvents = getEvents(
      relevantStartWindow,
      relevantEndWindow,
      EventUtil.getEmailForOtherAttendee(event)!
    );

    const eventConflict = nearbyEvents
      ?.filter((nearbyEvent) => nearbyEvent.id !== event.id)
      .some((nearbyEvent) =>
        checkIfEventIsRSVPYesAndOverlaps(event, nearbyEvent)
      );

    if (eventConflict) {
      if (
        ModifyEvent.eventLabelOrBlurbNeedsAddingOrTweaking(
          event,
          CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE,
          CheckConflict.CONFLICT_DESCRIPTION_BLURB
        )
      ) {
        return CheckTypes.ModificationType.YES_ADD_LABEL;
      }
      return undefined;
    } else {
      if (
        ModifyEvent.hasTitleLabelOrDescriptionBlurb(
          event,
          CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE,
          CheckConflict.CONFLICT_DESCRIPTION_BLURB
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
        CheckConflict.CONFLICT_TITLE_PREFIX_NOTICE,
        ModifyEvent.Direction.PREFIX
      ),
      ModifyEvent.modifyDescription(
        modificationType,
        event,
        CheckConflict.CONFLICT_DESCRIPTION_BLURB
      ),
    ];
  }

  export function checkIfEventIsRSVPYesAndOverlaps(
    myEvent: GoogleAppsScript.Calendar.Schema.Event,
    theirEvent: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    Log.log(`🔎 Examining their event: 📅 "${theirEvent.summary}"`);
    const theirEmail = EventUtil.getEmailForOtherAttendee(myEvent);
    if (theirEmail === undefined) {
      Log.log("🚨 TheirEmail undefined, error");
      return false;
    }
    const didTheyRSVPYes = EventUtil.didRSVPYes(theirEvent, theirEmail);
    if (!didTheyRSVPYes) {
      Log.log(`👎 They didnt RSVP yes to this event, ${theirEmail}`);
      return false;
    }

    if (
      !theirEvent.start?.dateTime ||
      !theirEvent.end?.dateTime ||
      !myEvent.start?.dateTime ||
      !myEvent.end?.dateTime
    ) {
      Log.log(
        "👎 Can't pull specific start and end times for their event, skipping"
      );
      return false;
    }

    const theirEventStart = new Date(theirEvent.start.dateTime);
    const theirEventEnd = new Date(theirEvent.end.dateTime);

    const myEventStart = new Date(myEvent.start.dateTime);
    const myEventEnd = new Date(myEvent.end.dateTime);

    if (myEventStart >= theirEventStart && myEventEnd <= theirEventEnd) {
      Log.log("✅ Yep, that event overlaps! Will modify and flag the event");
      return true;
    } else {
      Log.log(
        `👎 No, that event doensnt appear to overlap (interval check): start=${theirEventStart}, end=${theirEventEnd}, myEventStart=${myEventStart}, myEventEnd=${myEventEnd}`
      );
      return false;
    }
  }
}
