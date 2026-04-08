import { GetEvents } from "../../src/checks/get-events";
import { Time } from "../../src/checks/time";

jest.mock("../../src/checks/log", () => ({
  Log: {
    log: jest.fn(),
    logPhase: jest.fn(),
  },
}));

describe("getSundayOfCurrentWeek", () => {
  it("should return the previous Sunday if today is Monday", () => {
    const mockDate = new Date("2024-07-29T00:00:00Z"); // A Monday
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    const result: Date = Time.getSundayOfCurrentWeek();
    const expectedSunday: Date = new Date("2024-07-28T00:00:00Z");

    expect(result.getTime()).toBe(expectedSunday.getTime());

    jest.restoreAllMocks();
  });

  it("should return the previous Sunday if today is Wednesday", () => {
    const mockDate = new Date("2024-07-31T00:00:00Z"); // A Wednesday
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    const result: Date = Time.getSundayOfCurrentWeek();
    const expectedSunday: Date = new Date("2024-07-28T00:00:00Z");

    expect(result.getTime()).toBe(expectedSunday.getTime());

    jest.restoreAllMocks();
  });

  it("should return the previous Sunday if today is Saturday", () => {
    const mockDate = new Date("2024-08-03T00:00:00Z"); // A Saturday
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    const result: Date = Time.getSundayOfCurrentWeek();
    const expectedSunday: Date = new Date("2024-07-28T00:00:00Z");

    expect(result.getTime()).toBe(expectedSunday.getTime());

    jest.restoreAllMocks();
  });

  it("should return today if today is Sunday", () => {
    const mockDate = new Date("2024-07-28T00:00:00Z"); // A Sunday
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    const result: Date = Time.getSundayOfCurrentWeek();
    const expectedSunday: Date = new Date("2024-07-28T00:00:00Z");

    expect(result.getTime()).toBe(expectedSunday.getTime());

    jest.restoreAllMocks();
  });
});

describe("GetEvents.getEventsForDateRangeCustomCalendarResult", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    const globalAny = globalThis as any;
    globalAny.Calendar = {
      Events: {
        list: jest.fn(),
      },
    };
  });

  it("returns an empty events array when the calendar has no events", () => {
    const globalAny = globalThis as any;
    globalAny.Calendar.Events.list.mockReturnValue({ items: [] });

    expect(
      GetEvents.getEventsForDateRangeCustomCalendarResult(
        new Date("2026-04-07T00:00:00Z"),
        new Date("2026-04-08T00:00:00Z"),
        "empty-calendar@block.xyz"
      )
    ).toEqual({ events: [] });
  });

  it("includes the API error message when fetching fails", () => {
    const globalAny = globalThis as any;
    globalAny.Calendar.Events.list.mockImplementation(() => {
      throw new Error("Not Found");
    });

    expect(() =>
      GetEvents.getEventsForDateRangeCustomCalendar(
        new Date("2026-04-07T00:00:00Z"),
        new Date("2026-04-08T00:00:00Z"),
        "missing-calendar@block.xyz"
      )
    ).toThrow("Error fetching events: Not Found");
  });
});
