import { Log } from "../checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EventRecurrence {
  export enum RecurrenceType {
    DAILY,
    WEEKLY,
    EVERY_TWO_WEEKS,
    THREE_WEEKS_PLUS,
  }

  export function getRecurrenceInformation(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): EventRecurrence.RecurrenceType | undefined {
    Log.log(
      `Getting recurrence info for event 📅 ${event.summary} (id: ${event.id})`
    );
    if (event.recurringEventId === undefined) {
      Log.log(`Event is not recurring.`);
      return undefined;
    }

    const recurringEvent = Calendar.Events?.get(
      "primary",
      event.recurringEventId
    );

    return parseRecurrenceRule(recurringEvent!);
  }

  export function parseRecurrenceRule(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): EventRecurrence.RecurrenceType | undefined {
    const recurrenceRule = event?.recurrence?.find((recurrence) =>
      recurrence.startsWith("RRULE")
    );

    if (recurrenceRule === undefined) {
      return undefined;
    }
    Log.log(`Got recurrence rules: ${recurrenceRule}`);

    // Spec
    // https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html
    // Examples
    // RRULE:FREQ=WEEKLY;BYDAY=TH
    // RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=2;BYDAY=MO
    // RRULE:FREQ=MONTHLY;BYDAY=2FR
    // RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=4;BYDAY=FR
    if (recurrenceRule.includes("DAILY")) {
      Log.log(`Appears to be daily recurrence.`);
      return EventRecurrence.RecurrenceType.DAILY;
    } else if (recurrenceRule.includes("WEEKLY")) {
      if (recurrenceRule.includes("INTERVAL=2")) {
        Log.log(`Appears to be every two week.`);
        return EventRecurrence.RecurrenceType.EVERY_TWO_WEEKS;
      }

      if (!recurrenceRule.includes("INTERVAL=")) {
        Log.log(`Appears to be every week.`);
        return EventRecurrence.RecurrenceType.WEEKLY;
      }

      Log.log(`Appears to be every 3+ weeks.`);
      return EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS;
    } else {
      Log.log(`Appears to be every 3+ weeks.`);
      return EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS;
    }
  }
}
