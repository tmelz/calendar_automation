// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Time {
  export type Range = {
    timeMin: Date;
    timeMax: Date;
  };

  export function oneHourAgo(): Date {
    const date: Date = new Date();
    date.setHours(date.getHours() - 1);
    return date;
  }

  export function twoDaysAgo(): Date {
    const date: Date = new Date();
    date.setDate(date.getDate() - 2);
    return date;
  }

  export function todayThroughEndOfNextThreeWeeks(): Range {
    const sundayAfterThirdWeek = new Date(Time.getSundayOfNextWeek());
    sundayAfterThirdWeek.setDate(sundayAfterThirdWeek.getDate() + 14);
    return {
      timeMin: new Date(),
      timeMax: sundayAfterThirdWeek,
    };
  }

  export function todayThroughFiveMoreWeeks(): Range {
    const sundayAfterFifthWeek = new Date(Time.getSundayOfNextWeek());
    sundayAfterFifthWeek.setDate(sundayAfterFifthWeek.getDate() + 28);
    return {
      timeMin: new Date(),
      timeMax: sundayAfterFifthWeek,
    };
  }

  /**
   * Returns the instant at which the given "YYYY-MM-DD" date starts (midnight)
   * in the given IANA timezone. Falls back to the script's local timezone when
   * no timezone is provided or the timezone can't be resolved.
   */
  export function startOfDayInTimeZone(
    dateString: string,
    timeZone: string | undefined
  ): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    if (timeZone === undefined) {
      return new Date(year, month - 1, day);
    }
    try {
      const utcGuess = Date.UTC(year, month - 1, day);
      // Two passes: adjust the UTC guess by the zone's offset at that instant,
      // then re-check in case the adjustment crossed a DST transition.
      let instant =
        utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
      instant = utcGuess - getTimeZoneOffsetMs(new Date(instant), timeZone);
      return new Date(instant);
    } catch (error) {
      return new Date(year, month - 1, day);
    }
  }

  /** Returns the "YYYY-MM-DD" date one day after the given one. */
  export function nextDay(dateString: string): string {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1))
      .toISOString()
      .slice(0, 10);
  }

  function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const get = (type: string): number =>
      Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second")
    );
    return asUtc - date.getTime();
  }

  export function getSundayOfCurrentWeek(): Date {
    const today: Date = new Date();
    const first: number = today.getDate() - today.getDay() + 1;
    const last: number = first + 6;

    const sunday: Date = new Date(today.setDate(last));

    return sunday;
  }

  export function getSundayOfNextWeek(): Date {
    const followingSunday: Date = getSundayOfCurrentWeek();
    followingSunday.setDate(followingSunday.getDate() + 7);
    followingSunday.setHours(24, 0, 0, 0);

    return followingSunday;
  }
}
