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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Orchestrator {
  export const MAX_EVENTS_ALLOWED_TO_MODIFY: number = 30;
  export const OPT_OUT: string = "[opt_out_automation]";

  export type SaveEventChanges = (
    event: GoogleAppsScript.Calendar.Schema.Event
  ) => boolean;

  const CalendarChecks: { [key: string]: CheckTypes.CalendarCheck } = {
    OutOfOffice: CheckOOO.OutOfOfficeCheck,
    PlusFiveMinutes: CheckPlus5m.PlusFiveMinutesCheck,
    Quit: CheckQuit.QuitCheck,
    Conflict: CheckConflict.ConflictCheck,
  };

  export const allChecks: CheckTypes.CalendarCheck[] = [
    CalendarChecks.OutOfOffice,
    CalendarChecks.PlusFiveMinutes,
    CalendarChecks.Quit,
    CalendarChecks.Conflict,
  ];
  export const experimentalChecks: CheckTypes.CalendarCheck[] = [];

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
    const events = GetEvents.getEvents(timeRange, updatedMin);
    if (events.length === GetEvents.MAX_EVENTS_ALLOWED_TO_FETCH) {
      shouldCacheRun = false;
    }

    const withinModificationLimit = Orchestrator.checkEvents(
      Orchestrator.allChecks,
      events,
      isDryRun,
      Orchestrator.saveEvent
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

    const events = GetEvents.getEvents(
      Time.todayThroughEndOfNextWeek(),
      undefined
    );

    Orchestrator.checkEvents(
      Orchestrator.allChecks,
      events,
      isDryRun,
      Orchestrator.saveEvent
    );
  }

  // Return true if this result can be cached (eg we didn't hit the max
  // modification limit)
  export function checkEvents(
    calendarChecks: CheckTypes.CalendarCheck[],
    events: GoogleAppsScript.Calendar.Schema.Event[],
    isDryRun: boolean = true,
    saveEventChanges: Orchestrator.SaveEventChanges
  ): boolean {
    const locallyModifiedEventIds: Set<string> = new Set();
    const eventMap: Map<string, GoogleAppsScript.Calendar.Schema.Event> =
      new Map(events.map((event) => [event.id!, event]));
    const eventChangelog: Map<string, CheckTypes.Changelog> = new Map();

    Log.logPhase("Running checks on events 📆🔎");
    events.forEach((event) => {
      Log.log(`📆 Running for event "${event.summary}"`);
      LogLevel.DEBUG && Log.log(`\\Raw details: "${event}"`);
      if (!EventUtil.isOneOnOneWithMe(event)) {
        LogLevel.DEBUG &&
          Log.log(`👎 skipping, doesn't appear to be a 1:1 with me, ${event}`);
        return;
      }

      if (event.description?.includes(Orchestrator.OPT_OUT)) {
        Log.log(`👎 skipping, has opt out`);
        return;
      }

      Log.log(`✅ can analyze: running all checks for this event`);
      calendarChecks.forEach((check) => {
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

        saveEventChanges(event);
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
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    Log.log(`💾 Saving event, "${event.summary}"`);
    // My event, I can modify
    if (EventUtil.amITheOrganizer(event)) {
      Log.log(
        `👋 I am organizer, saving changes using calendar "${event.organizer!.email!}"`
      );
      Calendar.Events?.update(event, event.organizer!.email!, event.id!, {
        sendUpdates: "none",
      });
      return true;

      // Not my event, but I should be able to modify it directly on the organizers calendar
      // THIS REQUIRES their calendar is visible to you, at least with free/busy, otherwise the
      // API call will fail, even if you have modify access :( it's a weird API bug
      // https://issuetracker.google.com/issues/204791550
    } else if (event.guestsCanModify === true) {
      Log.log(
        `👎 I am not organizer, attempting to save changes on calendar, "${event.organizer!.email!}"`
      );
      try {
        Calendar.Events?.update(event, event.organizer!.email!, event.id!, {
          sendUpdates: "none",
        });
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
