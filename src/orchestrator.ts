import { EventUtil } from "./checks/event-util";
import { CheckOOO } from "./checks/check-ooo";
import { CheckPlus5m } from "./checks/check-plus-5m";
import { CheckTypes } from "./checks/check-types";
import { CheckQuit } from "./checks/check-quit";
import { CheckConflict } from "./checks/check-conflict";
import { GetEvents } from "./checks/get-events";
import { Time } from "./checks/time";
import { Cache } from "./cache";
import { LogLevel, Log } from "./checks/log";
import { Analytics } from "./analytics";
import { UserSettings } from "./checks/user-settings";
import { CheckColor } from "./checks/check-color";
import { CheckNotes } from "./checks/check-notes";
import { TeamCalendarOOO } from "./team_calendar/team-calendar-ooo";
import { TeamCalendarOncall } from "./team_calendar/team-calendar-pagerduty";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Orchestrator {
  // TODO carefully update this due to color changes
  export const MAX_EVENTS_ALLOWED_TO_MODIFY: number = 100;
  export const OPT_OUT: string = "[opt_out_automation]";

  export type SaveEventChanges = (
    event: GoogleAppsScript.Calendar.Schema.Event,
    changeMyCalendarOnly: boolean
  ) => boolean;

  export const applyToSourceEventChecks: CheckTypes.CalendarCheck[] = [
    CheckOOO.OutOfOfficeCheck,
    CheckPlus5m.PlusFiveMinutesCheck,
    CheckQuit.QuitCheck,
    CheckConflict.ConflictCheck,
    CheckNotes.NotesCheck,
  ];

  export const applyToPersonalEventOnlyChecks: CheckTypes.CalendarCheck[] = [
    CheckColor.ColorCheck,
  ];

  export function runTeamCalendarFeatures(isDryRun: boolean = true): void {
    Log.logPhase("🚀 Running team calendar features");

    const settings = UserSettings.loadSettings();

    if (!settings.enabled) {
      Log.log("🚨 Disabled, exiting");
      return;
    }

    const timeRange = Time.todayThroughThreeMoreWeeks();

    if (settings.teamCalendar.outOfOffice) {
      Log.log("🏃 Running Team calendar OOO checks");
      settings.teamCalendarSettings.outOfOffice.forEach(
        ({ calendarId, groupEmail }) => {
          if (calendarId.trim().length == 0 || groupEmail.trim().length == 0) {
            throw new Error("invariant violation");
            return;
          }
          TeamCalendarOOO.syncCalendarOOO(
            timeRange.timeMin,
            timeRange.timeMax,
            calendarId,
            groupEmail,
            isDryRun
          );
        }
      );
    } else {
      Log.log("🚨 Team calendar OOO disabled, skipping");
    }

    if (settings.teamCalendar.oncall) {
      Log.log("🏃 Running Team calendar oncall checks");
      TeamCalendarOncall.syncCalendarOncalls(
        timeRange.timeMin,
        timeRange.timeMax,
        settings.teamCalendarSettings.oncall,
        isDryRun
      );
    } else {
      Log.log("🚨 Team calendar oncall disabled, skipping");
    }
  }

  // Only look at events that have recently changed
  export function runFastChecks(isDryRun: boolean = true): void {
    if (isDryRun) {
      Analytics.disable();
    }
    const now = new Date();
    Log.logPhase("Looking up last execution details from cache 📦");
    let shouldCacheRun = !isDryRun;

    const timeRange = Time.todayThroughEndOfNextWeek();
    const updatedMin = Cache.calculateMostAggressiveUpdatedMin(
      Cache.getLastExecutionParams(),
      timeRange,
      Time.oneHourAgo()
    );
    Log.logPhase("Fetching events to analyze 🛜");
    let events = GetEvents.getEvents(timeRange, updatedMin);
    if (events.length === GetEvents.MAX_EVENTS_ALLOWED_TO_FETCH) {
      shouldCacheRun = false;
    }

    let withinModificationLimit = Orchestrator.checkEvents(
      Orchestrator.applyToSourceEventChecks,
      events,
      UserSettings.loadSettings(),
      isDryRun,
      Orchestrator.saveEvent
    );

    shouldCacheRun = shouldCacheRun && withinModificationLimit;

    // Need to re-fetch events if we're going to do further modifications
    // personal-calendar-only checks may go to a different calendar than
    // the previous modifications, which will cause an invalid seq error
    // without a re-fetch
    events = GetEvents.getEvents(timeRange, updatedMin, true); // suppress re-listing events
    if (events.length === GetEvents.MAX_EVENTS_ALLOWED_TO_FETCH) {
      shouldCacheRun = false;
    }
    withinModificationLimit = Orchestrator.checkEvents(
      Orchestrator.applyToPersonalEventOnlyChecks,
      events,
      UserSettings.loadSettings(),
      isDryRun,
      Orchestrator.saveEvent,
      true // apply to personal calendar only
    );

    shouldCacheRun = shouldCacheRun && withinModificationLimit;

    Log.logPhase("Post execution caching 📦");
    if (shouldCacheRun) {
      Log.log("Caching execution params");
      Cache.saveLastExecutionParams(now, timeRange, updatedMin, new Date());
    } else {
      Log.log("Not caching execution params");
    }
  }

  export function runAllChecks(isDryRun: boolean = true): void {
    if (isDryRun) {
      Analytics.disable();
    }
    Log.logPhase("Fetching events to analyze 🛜");

    let events = GetEvents.getEvents(
      Time.todayThroughEndOfNextWeek(),
      undefined
    );

    Log.logPhase("Running checks that apply to event on organizer's calendar");
    Orchestrator.checkEvents(
      Orchestrator.applyToSourceEventChecks,
      events,
      UserSettings.loadSettings(),
      isDryRun,
      Orchestrator.saveEvent
    );

    Log.logPhase(
      "Running checks that apply to personal calendar only, requires event re-fetch"
    );
    // Need to re-fetch events if we're going to do further modifications
    // personal-calendar-only checks may go to a different calendar than
    // the previous modifications, which will cause an invalid seq error
    // without a re-fetch
    events = GetEvents.getEvents(
      Time.todayThroughEndOfNextWeek(),
      undefined,
      true // suppress re-listing events
    );
    Orchestrator.checkEvents(
      Orchestrator.applyToPersonalEventOnlyChecks,
      events,
      UserSettings.loadSettings(),
      isDryRun,
      Orchestrator.saveEvent,
      true // apply to personal calendar only
    );
  }

  // Return true if this result can be cached (eg we didn't hit the max
  // modification limit)
  export function checkEvents(
    calendarChecks: CheckTypes.CalendarCheck[],
    events: GoogleAppsScript.Calendar.Schema.Event[],
    userSettings: UserSettings.Settings,
    isDryRun: boolean = true,
    saveEventChanges: Orchestrator.SaveEventChanges,
    changeMyCalendarOnly: boolean = false
  ): boolean {
    const locallyModifiedEventIds: Set<string> = new Set();
    const eventMap: Map<string, GoogleAppsScript.Calendar.Schema.Event> =
      new Map(events.map((event) => [event.id!, event]));
    const eventChangelog: Map<string, CheckTypes.Changelog> = new Map();

    const enabledChecks: CheckTypes.CalendarCheck[] = [];
    calendarChecks.forEach((check) => {
      if (UserSettings.isCheckEnabled(userSettings, check.id)) {
        Log.log(`✅ Check "${check.id}" is enabled`);
        enabledChecks.push(check);
      } else {
        Log.log(`🛑 Check "${check.id}" is disabled`);
      }
    });

    Log.logPhase("Running checks on events 📆🔎");
    events.forEach((event) => {
      Log.log(`📆 Running for event "${event.summary}"`);
      LogLevel.DEBUG && Log.log(`\\Raw details: "${event}"`);

      if (event.description?.includes(Orchestrator.OPT_OUT)) {
        Log.log(`👎 skipping, has opt out`);
        return;
      }

      // The events API says we shouldn't get cancelled events in the response unless
      // we ask for them, but I've seen regressions where they show up, and it can create
      // errors downstream if we try to modify them.
      // https://developers.google.com/calendar/api/v3/reference/events/list#parameters
      if (event.status === "cancelled") {
        Log.log(`👎 skipping, event is cancelled`);
        return;
      }

      Log.log(`✅ can analyze: running all checks for this event`);
      enabledChecks.forEach((check) => {
        Log.log(`🚦 Check "${check.id}":shouldModifyEvent`);
        const modificationType = check.shouldModifyEvent(event);
        if (modificationType !== undefined) {
          Log.log(`✅, running check "${check.id}":modifyEventLocally`);
          const changelog = check.modifyEventLocally(event, modificationType);
          locallyModifiedEventIds.add(event.id!);

          if (!eventChangelog.has(event.id!)) {
            eventChangelog.set(event.id!, []);
          }
          eventChangelog.get(event.id!)?.push(...changelog);
        } else {
          Log.log(
            `👎 Check "${check.id}":shouldModifyEvent returned false for this event`
          );
        }
      });
    });

    Log.logPhase(`Submitting modifications to GCal 🛰 (isDryRun=${isDryRun})`);
    if (locallyModifiedEventIds.size === 0) {
      Log.log("✅ No events to modify");
    }

    // Submit to Calendar
    Array.from(locallyModifiedEventIds)
      .slice(0, Orchestrator.MAX_EVENTS_ALLOWED_TO_MODIFY)
      .forEach((eventId) => {
        const event = eventMap.get(eventId);
        if (event === undefined) {
          return;
        }

        Log.log(`Changelog for 📅 "${event.summary}"`);
        eventChangelog.get(eventId)?.forEach((logEntry) => Log.log(logEntry));

        if (isDryRun) {
          Log.log(`🌵 Not modifying event, dry run;`);
          return;
        }

        saveEventChanges(event, changeMyCalendarOnly);
      });

    if (
      locallyModifiedEventIds.size >= Orchestrator.MAX_EVENTS_ALLOWED_TO_MODIFY
    ) {
      Log.log(`🚨 Hit max modification limit, should not cache`);
      return false;
    } else {
      return true;
    }
  }

  export function saveEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    changeMyCalendarOnly: boolean = false,
    sendUpdates: boolean = false
  ): boolean {
    Log.log(`💾 Saving event, "${event.summary}", sendUpdates=${sendUpdates}`);
    // Note: without supportsAttachments:true, attachment changes are silently dropped
    const updateArgs = sendUpdates
      ? { sendUpdates: "all", supportsAttachments: true }
      : { sendUpdates: "none", supportsAttachments: true };
    // My event, I can modify
    if (changeMyCalendarOnly || EventUtil.amITheOrganizer(event)) {
      const calendarId = changeMyCalendarOnly
        ? "primary"
        : event.organizer!.email!;
      if (changeMyCalendarOnly) {
        Log.log(`Forcing applying changes locally to my calendar only`);
      } else {
        Log.log(
          `👋 I am organizer, saving changes using calendar "${event.organizer!.email!}"`
        );
      }
      Calendar.Events?.update(event, calendarId, event.id!, updateArgs);
      return true;

      // Not my event, but I should be able to modify it directly on the organizers calendar
      // THIS REQUIRES their calendar is visible to you, at least with free/busy, otherwise the
      // API call will fail, even if you have modify access :( it's a weird API bug
      // https://issuetracker.google.com/issues/204791550
    } else if (event.guestsCanModify === true) {
      Log.log(
        `👎 I am not organizer, attempting to save changes on calendar, "${event.organizer!.email!}"`
      );

      // Ok this edge case makes me sad.
      // The scenario we're in is that we're modifying an event that is owned
      // by a different calendar. That's totally fine for most cases.
      // However, we fetched the event from our calendar, and thus it might
      // have a colorId set that is specific for our calendar. If you push
      // this event to another calendar AND you have edit permissions of that calendar
      // then the colorId will be applied to that event for all attendees.
      // We can workaround this by unsetting the colorId before pushing the change.
      // Of course this could backfire if someone is intentionally setting the color
      // of group calendar events. But I've honestly only ever seen that happen
      // by accident, so I'm OK with that assumption.
      if (event.colorId !== undefined) {
        console.log(
          "👿 Unsetting colorId for event temporarily while saving to another calendar, to avoid setting color for others."
        );
        event.colorId = undefined;
      }

      try {
        Calendar.Events?.update(
          event,
          event.organizer!.email!,
          event.id!,
          updateArgs
        );
        return true;
      } catch (error: any) {
        // GoogleJsonResponseException: API call to calendar.events.update failed with error: Not Found
        Log.log(
          `🚨 Error saving to calendar, "${event.organizer!.email!}, most likely we don't have visibility of their calendar and get a not found error. error: ${error.message}"`
        );
        return false;
      }
      // Not my event, and can't modify it on the organizers calendar, SOL
    } else {
      Log.log(
        `🚨  I am not organizer and don't have modification rights, cannot save "${event.organizer!.email!}"`
      );
      return false;
    }
  }
}
