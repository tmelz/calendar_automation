import { EventUtil } from "./event-util";
import { CheckTypes } from "./check-types";
import { GetEvents } from "./get-events";
import { ModifyEvent } from "./modify-event";
import { Analytics } from "../analytics";
import { Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckQuit {
  export const ID = "Quit";
  export const QuitCheck: CheckTypes.CalendarCheck = {
    id: CheckQuit.ID,
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };

  export const QUIT_TITLE_PREFIX_NOTICE: string = "[📅❓] ";
  export const QUIT_DESCRIPTION_BLURB: string =
    "<small><i>[📅❓: failed to fetch calendar for an attendee, unusual]</i></small>";

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): CheckTypes.ModificationType | undefined {
    if (!EventUtil.isOneOnOneWithMe(event)) {
      Log.log(
        `👎 skipping, doesn't appear to be a 1:1 with me, ${event.summary}`
      );
      return undefined;
    }

    if (!EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees)) {
      return undefined;
    }

    const now = new Date();
    const nowPlus5m = new Date(now.getTime() + 5 * 60000);
    let eventResult: GoogleAppsScript.Calendar.Schema.Event[] | undefined =
      undefined;
    for (let i = 0; i < 3; i++) {
      {
        eventResult = getEvents(
          now,
          nowPlus5m,
          EventUtil.getEmailForOtherAttendee(event)!,
          undefined,
          undefined,
          undefined
        );
        if (eventResult !== undefined) {
          break;
        }
      }
    }

    const quit = eventResult === undefined;

    if (quit) {
      if (
        ModifyEvent.eventLabelOrBlurbNeedsAddingOrTweaking(
          event,
          CheckQuit.QUIT_TITLE_PREFIX_NOTICE,
          CheckQuit.QUIT_DESCRIPTION_BLURB
        )
      ) {
        Analytics.recordModification(CheckQuit.ID);
        return CheckTypes.ModificationType.YES_ADD_LABEL;
      }
      return undefined;
    } else {
      if (
        ModifyEvent.hasTitleLabelOrDescriptionBlurb(
          event,
          CheckQuit.QUIT_TITLE_PREFIX_NOTICE,
          CheckQuit.QUIT_DESCRIPTION_BLURB
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
        CheckQuit.QUIT_TITLE_PREFIX_NOTICE,
        ModifyEvent.Direction.PREFIX
      ),
      ModifyEvent.modifyDescription(
        modificationType,
        event,
        CheckQuit.QUIT_DESCRIPTION_BLURB
      ),
    ];
  }
}
