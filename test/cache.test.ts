import { jest } from "@jest/globals";
import { Cache } from "../src/cache";
import { Time } from "../src/checks/time";

describe("Cache.calculateMostAggressiveUpdatedMin", () => {
  test("should use default when no cached execution params are found", () => {
    const timeRange: Time.Range = {
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
    };
    const defaultUpdateMin = new Date("2024-07-01T00:00:00Z");

    const result = Cache.calculateMostAggressiveUpdatedMin(
      undefined,
      timeRange,
      defaultUpdateMin
    );
    expect(result).toBe(defaultUpdateMin);
  });

  test("should return undefined if no cache and param says dont use default", () => {
    const timeRange: Time.Range = {
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
    };
    const defaultUpdateMin = new Date("2024-07-01T00:00:00Z");

    const result = Cache.calculateMostAggressiveUpdatedMin(
      undefined,
      timeRange,
      defaultUpdateMin,
      false
    );
    expect(result).toBe(undefined);
  });

  test("should return default update min when time range is not a subset of cached time range", () => {
    const cachedExecutionParams = {
      dateRun: new Date("2024-07-31T00:00:00Z"),
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
      updatedMin: undefined,
      dateFinished: new Date("2024-07-31T00:00:00Z"),
    };
    const timeRange: Time.Range = {
      timeMin: new Date("2024-07-01T00:00:00Z"),
      timeMax: new Date("2024-07-02T00:00:00Z"),
    };
    const defaultUpdateMin = new Date("2024-07-01T00:00:00Z");

    const result = Cache.calculateMostAggressiveUpdatedMin(
      cachedExecutionParams,
      timeRange,
      defaultUpdateMin
    );
    expect(result).toBe(defaultUpdateMin);
  });

  test("should return cached execution date when time range is a subset of cached time range and cached execution date is more recent", () => {
    const cachedExecutionParams = {
      dateRun: new Date("2024-08-01T12:00:00Z"),
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
      updatedMin: undefined,
      dateFinished: new Date("2024-08-01T12:05:00Z"),
    };
    const timeRange: Time.Range = {
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
    };
    const defaultUpdateMin = new Date("2024-07-31T00:00:00Z");

    const result = Cache.calculateMostAggressiveUpdatedMin(
      cachedExecutionParams,
      timeRange,
      defaultUpdateMin
    );
    expect(result).toBe(cachedExecutionParams.dateFinished);
  });

  test("should return default update min when cached execution date is not more recent", () => {
    const cachedExecutionParams = {
      dateRun: new Date("2024-06-01T12:00:00Z"),
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
      updatedMin: undefined,
      dateFinished: new Date("2024-06-01T12:00:00Z"),
    };
    const timeRange: Time.Range = {
      timeMin: new Date("2024-08-01T00:00:00Z"),
      timeMax: new Date("2024-08-02T00:00:00Z"),
    };
    const defaultUpdateMin = new Date("2024-07-31T00:00:00Z");

    const result = Cache.calculateMostAggressiveUpdatedMin(
      cachedExecutionParams,
      timeRange,
      defaultUpdateMin
    );
    expect(result).toBe(defaultUpdateMin);
  });
});
