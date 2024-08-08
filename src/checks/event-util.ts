import { LogLevel, Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EventUtil {
  export const BLOCK_EMAIL_DOMAINS: Set<string> = new Set([
    "block.xyz",
    "squareup.com",
    // not 100% about the below
    "cash.app",
    "tidal.com",
    "tbd.email",
  ]);
  export const GMAIL_DOMAIN: string = "gmail.com";

  export function isOneOnOneWithMe(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    const logMessage = "👎 Is not a 1:1 with me, reason: ";

    const isDefaultEvent = event.eventType === "default";
    if (!isDefaultEvent) {
      Log.log(logMessage + "event type is not 'default'");
      return false;
    }

    const isGroupOrganizer =
      event.organizer?.email?.includes("@group.calendar.google.com") === true;
    if (isGroupOrganizer) {
      Log.log(logMessage + "event is organized by a group");
      return false;
    }

    const isAllDayEvent = event.start?.date !== undefined;
    if (isAllDayEvent) {
      Log.log(logMessage + "event is an all-day event");
      return false;
    }

    const hasTwoAttendees = event.attendees?.length === 2;
    if (!hasTwoAttendees) {
      Log.log(logMessage + "event does not have exactly two attendees");
      return false;
    }

    const noEmailListAttendees = isAnAttendeeLikelyAnEmailList(event) === false;
    if (!noEmailListAttendees) {
      Log.log(logMessage + "one of the attendees appears to be an email list");
      return false;
    }

    const amIInvitee =
      event.attendees?.some((attendee) => attendee.self) === true;
    if (!amIInvitee) {
      Log.log(logMessage + "I am not a direct invitee");
      return false;
    }

    // Extra caution to avoid potentially modifying an interview.
    // These events shouldn't be modifyable anyway.
    const looksLikeInterview =
      event?.summary?.toLocaleLowerCase().startsWith("interview") ||
      event?.description?.toLowerCase().includes("scheduled interview") ||
      event?.organizer?.displayName?.toLowerCase().includes("interview");
    if (looksLikeInterview) {
      Log.log(logMessage + "this looks like an inerview");
      return false;
    }

    if (!amITheOrganizer(event) && event?.guestsCanModify !== true) {
      Log.log(
        logMessage + "I am not the organizer and cannot modify the event"
      );
      return false;
    }

    return true;
  }

  // this heuristic sucks.
  // but the api will just tell me that this is an attendee to the event:
  // {displayName=mdx-android, responseStatus=needsAction, email=mdx-android@squareup.com}
  // so it looks like one person, but in the UI it can be many.
  // basic heuristic here is just check if email starts with display name
  export function isAnAttendeeLikelyAnEmailList(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    return (
      event.attendees?.some((attendee) =>
        attendee.email?.startsWith(`${attendee.displayName}@`)
      ) ?? false
    );
  }

  export function amITheOrganizer(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    return (
      event?.attendees?.find((attendee) => attendee.self === true)
        ?.organizer === true
    );
  }

  // assume only used for 1:1 meetings
  export function getEmailForOtherAttendee(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): string | undefined {
    return event?.attendees?.find((attendee) => attendee.self !== true)?.email;
  }

  export function didRSVPYes(
    event: GoogleAppsScript.Calendar.Schema.Event,
    email: string
  ): boolean {
    const [username, domain] = email.split("@");

    // Check if the provided email has RSVP'd "Yes"
    const hasRSVPdYes =
      event.attendees?.find(
        (attendee) =>
          attendee.email === email && attendee.responseStatus === "accepted"
      ) !== undefined;

    // If the email domain is not in the Block domains, return the result of the initial check
    if (!EventUtil.BLOCK_EMAIL_DOMAINS.has(domain)) {
      return hasRSVPdYes;
    }

    // If the email domain is a Block domain, check other emails in the Block with the same username
    // really gross to have to do this
    const otherRSVPdYes =
      event.attendees?.find((attendee) => {
        if (!attendee.email) {
          return false;
        }

        const [attendeeUsername, attendeeDomain] = attendee.email.split("@");
        return (
          attendeeUsername === username &&
          EventUtil.BLOCK_EMAIL_DOMAINS.has(attendeeDomain) &&
          attendee.responseStatus === "accepted"
        );
      }) !== undefined;

    return hasRSVPdYes || otherRSVPdYes;
  }

  export function getMeetingStartMinuteOfDay(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): number | undefined {
    if (event.start?.dateTime) {
      return new Date(event.start?.dateTime).getMinutes();
    }

    return undefined;
  }

  export function getMeetingDurationMinutes(
    event: GoogleAppsScript.Calendar.Schema.Event
  ): number {
    if (event.start?.dateTime && event.end?.dateTime) {
      return (
        (new Date(event.end?.dateTime).getTime() -
          new Date(event.start?.dateTime).getTime()) /
        60000
      );
    }

    return -1;
  }

  export function doAllAttendeesHaveSameBusinessEmailDomain(
    attendees: GoogleAppsScript.Calendar.Schema.EventAttendee[] | undefined
  ): boolean {
    const emailDomains: Set<string> = new Set(
      attendees
        ?.filter((attendee) => {
          return attendee.email !== undefined;
        })
        .map((attendee) => {
          return attendee.email!.split("@")[1];
        })
    );

    // If both folks are @gmail.com, doesn't count
    if (emailDomains.has(EventUtil.GMAIL_DOMAIN) && emailDomains.size === 1) {
      return false;
    }

    const attendeesHaveSameEmailDomain =
      attendees?.length === 2 &&
      (emailDomains.size === 1 ||
        [...emailDomains].every((domain) =>
          EventUtil.BLOCK_EMAIL_DOMAINS.has(domain)
        ));

    return attendeesHaveSameEmailDomain;
  }
}
