import { jest } from "@jest/globals";
import {
  myOneOnOneEvent,
  oneOnOneOwnedByTHem,
  interviewEvent,
} from "./event-data";
import { EventUtil } from "../../src/checks/event-util";

describe("EventUtil.amITheOrganizer", () => {
  test("should return true for my event", () => {
    expect(EventUtil.amITheOrganizer(myOneOnOneEvent)).toBe(true);
  });

  test("should return false for someone elses event", () => {
    expect(EventUtil.amITheOrganizer(oneOnOneOwnedByTHem)).toBe(false);
  });
});

describe("EventUtil.isOneOnOneWithMe", () => {
  test("should return true for a valid 1:1 event", () => {
    expect(EventUtil.isOneOnOneWithMe(myOneOnOneEvent)).toBe(true);
  });

  test("should return false if not the organizer and guests cannot modify", () => {
    const eventNotTheOrganizer: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          responseStatus: "accepted",
          organizer: true,
          email: "john.doe@example.com",
        },
        {
          email: "jane.doe@example.com",
          responseStatus: "needsAction",
          self: true,
        },
      ],
      guestsCanModify: false,
    };
    expect(EventUtil.isOneOnOneWithMe(eventNotTheOrganizer)).toBe(false);
  });

  test("should return true if not the organizer but guests can modify", () => {
    const eventNotTheOrganizer: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          responseStatus: "accepted",
          organizer: true,
          email: "john.doe@example.com",
        },
        {
          email: "jane.doe@example.com",
          responseStatus: "needsAction",
          self: true,
        },
      ],
    };
    expect(EventUtil.isOneOnOneWithMe(eventNotTheOrganizer)).toBe(true);
  });

  test("should return false when event type is not default", () => {
    const eventTypeNotDefaultEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      eventType: "outOfOffice",
    };
    expect(EventUtil.isOneOnOneWithMe(eventTypeNotDefaultEvent)).toBe(false);
  });

  test("should return false when event is organized by a group", () => {
    const groupOrganizerEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      organizer: { email: "group@group.calendar.google.com" },
    };
    expect(EventUtil.isOneOnOneWithMe(groupOrganizerEvent)).toBe(false);
  });

  test("should return false when event looks like an Interview", () => {
    expect(EventUtil.isOneOnOneWithMe(interviewEvent)).toBe(false);
  });

  // Remove organizer to test other interview event heuristics
  test("should return false when event looks like an Interview", () => {
    const event: GoogleAppsScript.Calendar.Schema.Event = {
      ...interviewEvent,
      organizer: undefined,
    };
    expect(EventUtil.isOneOnOneWithMe(event)).toBe(false);
  });

  test("should return false for an all-day event", () => {
    const allDayEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      start: { date: "2024-07-26" },
    };
    expect(EventUtil.isOneOnOneWithMe(allDayEvent)).toBe(false);
  });

  test("should return false when event does not have exactly two attendees", () => {
    const lessThanTwoAttendeesEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          email: "john.doe@example.com",
          responseStatus: "accepted",
          self: true,
          organizer: true,
        },
      ],
    };
    const moreThanTwoAttendeesEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        ...myOneOnOneEvent.attendees!,
        { email: "jane.doe2@example.com", responseStatus: "needsAction" },
      ],
    };
    expect(EventUtil.isOneOnOneWithMe(lessThanTwoAttendeesEvent)).toBe(false);
    expect(EventUtil.isOneOnOneWithMe(moreThanTwoAttendeesEvent)).toBe(false);
  });

  test("should return false when one attendee is likely an email list", () => {
    const emailListAttendeeEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          responseStatus: "accepted",
          self: true,
          organizer: true,
        },
        {
          displayName: "foobar",
          responseStatus: "needsAction",
          email: "foobar@baz.com",
        },
      ],
    };
    expect(EventUtil.isOneOnOneWithMe(emailListAttendeeEvent)).toBe(false);
  });

  test("should return false when I am not a direct invitee", () => {
    const notDirectInviteeEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          email: "jane.doe@example.com",
          responseStatus: "accepted",
          organizer: true,
        },
        { email: "john.doe@example.com", responseStatus: "needsAction" },
      ],
    };
    expect(EventUtil.isOneOnOneWithMe(notDirectInviteeEvent)).toBe(false);
  });
});

describe("EventUtil.getEmailForOtherAttendee", () => {
  test("should return the email of the other attendee", () => {
    expect(EventUtil.getEmailForOtherAttendee(myOneOnOneEvent)).toBe(
      "jane.doe@example.com"
    );
  });

  test("should return undefined when there is no other attendee", () => {
    const oneAttendeeEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          email: "john.doe@example.com",
          responseStatus: "accepted",
          self: true,
          organizer: true,
        },
      ],
    };
    expect(
      EventUtil.getEmailForOtherAttendee(oneAttendeeEvent)
    ).toBeUndefined();
  });
});

describe("EventUtil.getMeetingStartMinuteOfDay", () => {
  test("should return the start minute of the meeting", () => {
    expect(EventUtil.getMeetingStartMinuteOfDay(myOneOnOneEvent)).toBe(0);
  });

  test("should return undefined when start dateTime is not defined", () => {
    const noStartDateTimeEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      start: undefined,
    };
    expect(
      EventUtil.getMeetingStartMinuteOfDay(noStartDateTimeEvent)
    ).toBeUndefined();
  });
});

describe("EventUtil.getMeetingDurationMinutes", () => {
  test("should return the duration of the meeting in minutes", () => {
    expect(EventUtil.getMeetingDurationMinutes(myOneOnOneEvent)).toBe(30);
  });

  test("should return -1 when start or end dateTime is not defined", () => {
    const noEndDateTimeEvent: GoogleAppsScript.Calendar.Schema.Event = {
      ...myOneOnOneEvent,
      end: undefined,
    };
    expect(EventUtil.getMeetingDurationMinutes(noEndDateTimeEvent)).toBe(-1);
  });
});

describe("CheckQuit.doAllAttendeesHaveSameBusinessEmailDomain", () => {
  test("should return true for attendees with the same domain", () => {
    const attendees = [
      { email: "test@block.xyz" },
      { email: "another@block.xyz" },
    ];
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(attendees)).toBe(
      true
    );
  });

  test("should return false for attendees with different domains", () => {
    const attendees = [
      { email: "test@block.xyz" },
      { email: "another@example.com" },
    ];
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(attendees)).toBe(
      false
    );
  });

  test("should return false for attendees with same gmail domain", () => {
    const attendees = [{ email: "a@gmail.com" }, { email: "b@gmail.com" }];
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(attendees)).toBe(
      false
    );
  });

  test("should return true for attendees from block domains", () => {
    const attendees = [
      { email: "test@block.xyz" },
      { email: "another@squareup.com" },
    ];
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(attendees)).toBe(
      true
    );
  });

  test("should return false for undefined attendees", () => {
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(undefined)).toBe(
      false
    );
  });

  test("should return true for empty attendees array", () => {
    expect(EventUtil.doAllAttendeesHaveSameBusinessEmailDomain([])).toBe(false);
  });
});

describe("EventUtil.didRSVPYes", () => {
  const eventTemplate = {
    attendees: [],
  } as GoogleAppsScript.Calendar.Schema.Event;

  test('should return true if provided email has RSVP\'d "Yes"', () => {
    const event = {
      ...eventTemplate,
      attendees: [
        { email: "user@domain.com", responseStatus: "accepted" },
        { email: "other@domain.com", responseStatus: "accepted" },
      ],
    };
    expect(EventUtil.didRSVPYes(event, "user@domain.com")).toBe(true);
  });

  test('should return false if provided email has not RSVP\'d "Yes"', () => {
    const event = {
      ...eventTemplate,
      attendees: [
        { email: "user@domain.com", responseStatus: "declined" },
        { email: "other@domain.com", responseStatus: "accepted" },
      ],
    };
    expect(EventUtil.didRSVPYes(event, "user@domain.com")).toBe(false);
  });

  test('should return true if another email with the same username and a blocked domain has RSVP\'d "Yes"', () => {
    const event = {
      ...eventTemplate,
      attendees: [
        { email: "foo@domain.com", responseStatus: "declined" },
        { email: "bar@block.xyz", responseStatus: "accepted" },
      ],
    };
    expect(EventUtil.didRSVPYes(event, "bar@squareup.com")).toBe(true);
  });

  test("should return false if no attendees are present", () => {
    const event = {
      ...eventTemplate,
      attendees: [],
    };
    expect(EventUtil.didRSVPYes(event, "user@domain.com")).toBe(false);
  });

  test("should handle attendee with undefined email", () => {
    const event = {
      ...eventTemplate,
      attendees: [
        { email: "user@domain.com", responseStatus: "declined" },
        { email: undefined, responseStatus: "accepted" },
      ],
    };
    expect(EventUtil.didRSVPYes(event, "user@domain.com")).toBe(false);
  });

  test("should handle multiple blocked domains with the same username", () => {
    const event = {
      ...eventTemplate,
      attendees: [
        { email: "user@block.xyz", responseStatus: "declined" },
        { email: "user@cash.app", responseStatus: "accepted" },
      ],
    };
    expect(EventUtil.didRSVPYes(event, "user@block.xyz")).toBe(true);
  });
});
