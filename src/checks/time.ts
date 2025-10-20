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
