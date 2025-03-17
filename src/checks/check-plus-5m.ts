import { EventUtil } from "./event-util";
import { CheckTypes } from "./check-types";
import { ModifyEvent } from "./modify-event";
import { Log } from "./log";
import { Analytics } from "../analytics";
import { UserSettings } from "./user-settings";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckPlus5m {
  export const ID = "PlusFiveMinutes";
  export const PlusFiveMinutesCheck: CheckTypes.CalendarCheck = {
    id: CheckPlus5m.ID,
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };

  export type Settings = {
    oneOnOnes: boolean;
    anyEventIOrganizeOrCreateWithAttendees: boolean;
    // anyEventWithFiveOrFewerPeopleAndNoEmailListAttendees: boolean;
  };
  export const OPT_OUT: string = "[opt_out_plus5m]";

  // add these to modified meetings to indicate that it starts 5m late and why
  export const TITLE_SUFFIX_NOTICES_DEPRECATED: string[] = [" [⚠️ +5m start]"];
  export const DESCRIPTION_SUFFIX_NOTICES_DEPRECATED: string[] = [
    "<small><i>[Note from Tim: I've automatically updated this meeting to start +5m. With frequent meetings, this helps me handle action items and take a breather so that I can join fresh and ready to focus. Please reach out with any concerns!]</i><small>",
    "<small><i>[Note: this meeting has been automatically modified to start +5m. Reachout to tmellor@ with any concerns.]</i><small>",
    `<small><i>[Note from Tim: I've automatically updated this meeting to start +5m. With frequent meetings, this helps me handle action items and take a breather so that I can join fresh and ready to focus. Please reach out with any concerns! See <a href="http://go/cal5m" target="_blank">go/cal5m</a>]</i><small></small></small>`,
    `<small><i>[Note from Tim: I've automatically updated this meeting to start +5m. With frequent meetings, this helps me handle action items and take a breather so that I can join fresh and ready to focus. Please reach out with any concerns! See <a href='http://go/cal5m'>go/cal5m</a>]</i><small>`,
    "<small><i>[Note: this meeting has been automatically modified to start +5m. Reachout to tmellor@ with any concerns.]</i></small>",
  ];
  export const DESCRIPTION_SUFFIX_NOTICE: string =
    "<small><i>[⚠️: this meeting has been automatically modified to start +5m.]</i></small>";

  export function isOkToModifyEventBasedOnSettings(
    event: GoogleAppsScript.Calendar.Schema.Event,
    settings: Settings
  ): boolean {
    // Pre-existing behavior for 1:1s
    if (settings.oneOnOnes && EventUtil.isOneOnOneWithMe(event)) {
      return true;
    }

    // Allow for more generalized case, but first do basic exclusions
    // Can clean this up in the future since some is redundant with 1:1 check
    const logMessage = "👎 Not ok to modify event, reason: ";

    const isDefaultEvent = event.eventType === "default";
    if (!isDefaultEvent) {
      Log.log(logMessage + "event type is not 'default'");
      return false;
    }

    const guestVisibilityRestricted = event.guestsCanSeeOtherGuests === false;
    if (guestVisibilityRestricted) {
      Log.log(logMessage + "guestsCanSeeOtherGuests is false");
      return false;
    }

    const isAllDayEvent = event.start?.date !== undefined;
    if (isAllDayEvent) {
      Log.log(logMessage + "event is an all-day event");
      return false;
    }

    const amITheOrganizer = EventUtil.amITheOrganizer(event);
    if (!amITheOrganizer && event?.guestsCanModify !== true) {
      Log.log(
        logMessage + "I am not the organizer and cannot modify the event"
      );
      return false;
    }

    // Basic exclusions finished, let's do checks specific to other settings
    if (
      settings.anyEventIOrganizeOrCreateWithAttendees &&
      (amITheOrganizer || EventUtil.amITheCreator(event)) &&
      (event.attendees?.length ?? 0) > 0
    ) {
      Log.log(
        "👍 ok to modify event based on settings, reason: " +
          "I am the organizer or creator and the event has attendees"
      );
      return true;
    }

    // TODO any event with 5 or fewer attendees and no email list attendees

    return false;
  }

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    settings: Settings = UserSettings.loadSettings().checkSettings
      .plusFiveMinutes
  ): CheckTypes.ModificationType | undefined {
    if (!isOkToModifyEventBasedOnSettings(event, settings)) {
      Log.log(
        `👎 skipping, not ok to modify based on settings, ${event.summary}`
      );
      return undefined;
    }

    if (event.description?.includes(CheckPlus5m.OPT_OUT)) {
      Log.log(`👎 skipping, has opt out`);
      return undefined;
    }

    const meetingStartMinute = EventUtil.getMeetingStartMinuteOfDay(event);
    const meetingDuration = EventUtil.getMeetingDurationMinutes(event);

    // Don't update meetings less than 25m or over 60m
    // (we're assuming these are 1:1s based on earlier checks in Orchestrator)
    const shouldConsiderUpdating =
      meetingDuration >= 25 && meetingDuration <= 60;
    if (!shouldConsiderUpdating) {
      return undefined;
    }

    // If the meeting starts on the hour or half hour, update
    if (meetingStartMinute === 0 || meetingStartMinute === 30) {
      Analytics.recordModification(CheckPlus5m.ID);
      return CheckTypes.ModificationType.YES_ADD_LABEL;
      // If meeting already starts past 5m check if the label needs updating
    } else if (meetingStartMinute === 5 || meetingStartMinute === 35) {
      // check if I'm the organizer, if they organized it I won't add a
      // description blurb
      if (
        EventUtil.amITheOrganizer(event) &&
        ModifyEvent.eventLabelOrBlurbNeedsAddingOrTweaking(
          event,
          undefined,
          CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE,
          CheckPlus5m.DESCRIPTION_SUFFIX_NOTICES_DEPRECATED,
          CheckPlus5m.TITLE_SUFFIX_NOTICES_DEPRECATED
        )
      ) {
        Analytics.recordModification(CheckPlus5m.ID);
        return CheckTypes.ModificationType.YES_ADD_LABEL;
      }
      // label doenst need updating
      return undefined;
    } else {
      return undefined;
    }
  }

  export function modifyEventLocally(
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType
  ): CheckTypes.Changelog {
    if (modificationType !== CheckTypes.ModificationType.YES_ADD_LABEL) {
      Log.log(`Called with remove label, not supported here`);
      return [];
    }

    const changelog: string[] = [];

    // Check if we should update meeting start time or if we're just here for
    // label
    const meetingStartMinute = EventUtil.getMeetingStartMinuteOfDay(event);
    if (meetingStartMinute === 0 || meetingStartMinute === 30) {
      // Update start and end times as necessary
      const oldStart: Date = new Date(event.start!.dateTime!);
      const oldEnd: Date = new Date(event.end!.dateTime!);
      const meetingDurationMinutes: number =
        (oldEnd.getTime() - oldStart.getTime()) / 60000;

      // start time
      const newStart: Date = new Date(event.start!.dateTime!);
      const newStartMinutes: number = newStart.getMinutes() + 5;
      newStart.setMinutes(newStartMinutes);
      event.start!.dateTime = newStart.toISOString();
      const logEntry = `🕰️ updating meeting start time +5m from "${oldStart.toLocaleString()}" to "${newStart.toLocaleString()}"`;
      Log.log(logEntry);
      changelog.push(logEntry);

      // if "speedy meetings" is set then meeting will now start 5m late and end 5m early... AFAICT no one
      // abides by the end early setting anyway so nuke it and move the end back to the hour/half-hour
      if (meetingDurationMinutes === 25 || meetingDurationMinutes === 50) {
        const newEnd: Date = new Date(event.end!.dateTime!);
        const newEndMinutes: number =
          newEnd.getMinutes() + (meetingDurationMinutes === 25 ? 5 : 10);
        newEnd.setMinutes(newEndMinutes);
        event.end!.dateTime = newEnd.toISOString();

        const logEntry = `🏁 adjusting end time to account for speedy meetings setting (meetingDurationMinutes=${meetingDurationMinutes}), moving +5m from "${oldEnd.toLocaleString()}" to "${newEnd.toLocaleString()}"`;
        Log.log(logEntry);
        changelog.push(logEntry);
      } else {
        Log.log(
          `❌ not adjusting end time to account for speedy meetings setting, meetingDurationMinutes=${meetingDurationMinutes}`
        );
      }
    }

    changelog.push(
      ModifyEvent.modifyTitle(
        modificationType,
        event,
        undefined,
        ModifyEvent.Direction.SUFFIX,
        CheckPlus5m.TITLE_SUFFIX_NOTICES_DEPRECATED
      )
    );

    changelog.push(
      ModifyEvent.modifyDescription(
        modificationType,
        event,
        CheckPlus5m.DESCRIPTION_SUFFIX_NOTICE,
        CheckPlus5m.DESCRIPTION_SUFFIX_NOTICES_DEPRECATED
      )
    );

    return changelog;
  }
}
