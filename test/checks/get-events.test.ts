import { Time } from "../../src/checks/time";

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
