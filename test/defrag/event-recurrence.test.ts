import { myOneOnOneEvent } from "../checks/event-data";
import { EventRecurrence } from "../../src/defrag/event-recurrence";

describe("parseRecurrenceRule", () => {
  it("parses correctly", () => {
    expect(
      EventRecurrence.parseRecurrenceRule({
        ...myOneOnOneEvent,
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=TH"],
      })
    ).toBe(EventRecurrence.RecurrenceType.WEEKLY);

    expect(
      EventRecurrence.parseRecurrenceRule({
        ...myOneOnOneEvent,
        recurrence: ["RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=2;BYDAY=MO"],
      })
    ).toBe(EventRecurrence.RecurrenceType.EVERY_TWO_WEEKS);

    expect(
      EventRecurrence.parseRecurrenceRule({
        ...myOneOnOneEvent,
        recurrence: ["RRULE:FREQ=MONTHLY;BYDAY=2FR"],
      })
    ).toBe(EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS);

    expect(
      EventRecurrence.parseRecurrenceRule({
        ...myOneOnOneEvent,
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=TH"],
      })
    ).toBe(EventRecurrence.RecurrenceType.WEEKLY);

    expect(
      EventRecurrence.parseRecurrenceRule({
        ...myOneOnOneEvent,
        recurrence: ["RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=4;BYDAY=FR"],
      })
    ).toBe(EventRecurrence.RecurrenceType.THREE_WEEKS_PLUS);
  });
});
