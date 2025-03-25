import { EventUtil } from "./event-util";
import { CheckTypes } from "./check-types";
import { GetEvents } from "./get-events";
import { Analytics } from "../analytics";
import { Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckNotes {
  export const ID = "Notes";
  export const NotesCheck: CheckTypes.CalendarCheck = {
    id: CheckNotes.ID,
    shouldModifyEvent: checkShouldModifyEvent,
    modifyEventLocally: modifyEventLocally,
  };

  // mapping of email to relevant 1:1 notes doc
  // lazily populating this and storing it statically here is pretty gross
  // but a reasonable compromise given the current design
  export let notesMapping:
    | Map<string, GoogleAppsScript.Calendar.Schema.EventAttachment>
    | undefined = undefined;

  export function initNotesMapping(
    anchorDate: Date,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ) {
    if (CheckNotes.notesMapping !== undefined) {
      return;
    }

    CheckNotes.notesMapping = createNotesMapping(anchorDate, getEvents);
  }

  export function createNotesMapping(
    anchorDate: Date,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): Map<string, GoogleAppsScript.Calendar.Schema.EventAttachment> {
    Log.log(
      `Lazily populating notes mapping for ${anchorDate.toLocaleDateString()}`
    );
    const results = new Map();

    // Tradeoff of completeness vs perf of processing the events, seems to take about 3s for -30d,
    // about 10s for -60d; not precise numbers but gives the idea that -30d is probably fine for almost
    // all cases.
    const oneMonthLookback = new Date(
      anchorDate.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    const events = getEvents(
      oneMonthLookback,
      anchorDate,
      "primary",
      undefined,
      1000, // bump max results due to large query, for -30d I'm getting about 600 events personally
      undefined
    );
    // filter to events where event.recurringEventId !== undefined and event.attachments?.length === 1
    // and EventUtil.isOneOnOneWithMe(event)
    // then use EventUtil.getEmailForOtherAttendee(event) as the key and the attachment as the value
    events?.forEach((event) => {
      if (
        event.recurringEventId !== undefined &&
        event.attachments?.length === 1 &&
        EventUtil.isOneOnOneWithMe(event) &&
        event.attachments![0].fileUrl?.includes(".google.com")
      ) {
        const email = EventUtil.getEmailForOtherAttendee(event);
        if (email) {
          const standardizedEmail = EventUtil.standardizeEmail(email);
          Log.log(
            `📝 recording notes for ${standardizedEmail} via event ${event.summary}, ${event.attachments![0].title}, ${event.attachments![0].fileUrl}`
          );
          results?.set(standardizedEmail, event.attachments![0]);
        }
      }
    });

    return results;
  }

  export function getNotesForEmail(
    anchorDate: Date,
    email: string,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): GoogleAppsScript.Calendar.Schema.EventAttachment | undefined {
    initNotesMapping(anchorDate, getEvents);
    return CheckNotes.notesMapping?.get(EventUtil.standardizeEmail(email));
  }

  export function checkShouldModifyEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): CheckTypes.ModificationType | undefined {
    if (event.recurringEventId !== undefined) {
      Log.log(`👎 skipping, event is recurring`);
      return undefined;
    }

    if (!EventUtil.isOneOnOneWithMe(event)) {
      Log.log(
        `👎 skipping, doesn't appear to be a 1:1 with me, ${event.summary}`
      );
      return undefined;
    }

    if (event.attachments?.length ?? 0 > 0) {
      Log.log(`👎 skipping, event has attachments`);
      return undefined;
    }

    // fetch potentially relevant notes doc
    const notesDoc = getNotesForEmail(
      new Date(event.start!.dateTime!),
      EventUtil.getEmailForOtherAttendee(event)!,
      getEvents
    );
    if (notesDoc === undefined) {
      Log.log(`👎 skipping, no notes doc found`);
      return undefined;
    }

    return CheckTypes.ModificationType.YES_ADD_NOTES;
  }

  export function modifyEventLocally(
    event: GoogleAppsScript.Calendar.Schema.Event,
    modificationType: CheckTypes.ModificationType,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch
  ): CheckTypes.Changelog {
    if (modificationType !== CheckTypes.ModificationType.YES_ADD_NOTES) {
      Log.log(`👎 skipping, modification type is not YES_ADD_NOTES`);
      return [];
    }

    const notesDoc = getNotesForEmail(
      new Date(event.start!.dateTime!),
      EventUtil.getEmailForOtherAttendee(event)!,
      getEvents
    );

    if (notesDoc === undefined) {
      Log.log(`👎 skipping, no notes doc found`);
      return [];
    }

    Analytics.recordModification(CheckNotes.ID);
    event.attachments = [notesDoc];

    return [
      `Added notes from ${notesDoc.title} to ${event.summary}, ${notesDoc.fileUrl}`,
    ];
  }
}
