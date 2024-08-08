import { Time } from "./checks/time";
import { LogLevel, Log } from "./checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Cache {
  export const FAST_CHECKS_RUNS_CACHE_KEY: string = "fastChecksRuns_v1";

  interface ExecutionParams {
    dateRun: Date;
    timeMin: Date;
    timeMax: Date;
    updatedMin: Date | undefined;
    dateFinished: Date;
  }

  export function calculateMostAggressiveUpdatedMin(
    cachedExecutionParams: ExecutionParams | undefined,
    timeRange: Time.Range,
    defaultUpdatedMin: Date,
    ifNoCachedResultsUseDefault: boolean = true
  ): Date | undefined {
    Log.log("Calculating most aggressive updatedMin for event query");
    Log.log("Cached execution params:");
    Log.log(`\tDate run: ${cachedExecutionParams?.dateRun.toLocaleString()}`);
    Log.log(`\tTime min: ${cachedExecutionParams?.timeMin.toLocaleString()}`);
    Log.log(`\tTime max: ${cachedExecutionParams?.timeMax.toLocaleString()}`);
    Log.log(
      `\tDate Finished: ${cachedExecutionParams?.dateFinished.toLocaleString()}`
    );
    Log.log(
      `\tUpdated min: ${cachedExecutionParams?.updatedMin?.toLocaleString()}`
    );
    Log.log(
      `\tTime range: ${timeRange.timeMin.toLocaleString()} -- ${timeRange.timeMax.toLocaleString()}`
    );
    Log.log(`\tDefault update min: ${defaultUpdatedMin.toLocaleString()}`);

    if (cachedExecutionParams === undefined) {
      if (ifNoCachedResultsUseDefault) {
        Log.log(
          `No cached execution params found, returning defaultupdatedMin ${defaultUpdatedMin.toLocaleString()}`
        );
        return defaultUpdatedMin;
      } else {
        Log.log(
          `No cached execution params found, returning defaultupdatedMin undefined}`
        );
        return undefined;
      }
    }

    if (
      timeRange.timeMin >= cachedExecutionParams.timeMin &&
      timeRange.timeMax <= cachedExecutionParams.timeMax
    ) {
      Log.log(
        "Time range is a subset of cached time range, will try to leverage cached info to set aggressive updatedMin"
      );
      if (cachedExecutionParams.dateFinished > defaultUpdatedMin) {
        Log.log(
          "Cached execution date is more recent than default update min, using dateFinished as new updatedMin"
        );
        return cachedExecutionParams.dateFinished;
      } else {
        Log.log(
          "Cached execution date run is older than default update min, won't use cached info"
        );
      }
    }

    Log.log("Returning default update min");
    return defaultUpdatedMin;
  }

  export function saveLastExecutionParams(
    dateRun: Date,
    timeRange: Time.Range,
    updatedMin: Date | undefined,
    dateFinished: Date
  ): void {
    Log.log("Saving last execution params in cache");
    Log.log(`\tDate run: ${dateRun.toLocaleString()}`);
    Log.log(`\tTime min: ${timeRange.timeMin.toLocaleString()}`);
    Log.log(`\tTime max: ${timeRange.timeMax.toLocaleString()}`);
    Log.log(`\tUpdated min: ${updatedMin?.toLocaleString()}`);
    Log.log(`\tDate Finished: ${dateFinished.toLocaleString()}`);

    const userProperties = PropertiesService.getUserProperties();

    const dateStruct: ExecutionParams = {
      dateRun: dateRun,
      timeMin: timeRange.timeMin,
      timeMax: timeRange.timeMax,
      updatedMin: updatedMin,
      dateFinished: dateFinished,
    };

    userProperties.setProperty(
      Cache.FAST_CHECKS_RUNS_CACHE_KEY,
      JSON.stringify(dateStruct)
    );

    Log.log("Execution params saved successfully");
  }

  export function getLastExecutionParams(): ExecutionParams | undefined {
    Log.log("Getting cached last execution params");

    const userProperties = PropertiesService.getUserProperties();
    const data = userProperties.getProperty(Cache.FAST_CHECKS_RUNS_CACHE_KEY);

    if (data) {
      LogLevel.DEBUG && Log.log(`Found cached execution params: ${data}`);
      const dateStruct: ExecutionParams = JSON.parse(data);
      // Converting strings back to Date objects
      dateStruct.dateRun = new Date(dateStruct.dateRun);
      dateStruct.timeMin = new Date(dateStruct.timeMin);
      dateStruct.timeMax = new Date(dateStruct.timeMax);
      dateStruct.updatedMin =
        dateStruct.updatedMin !== undefined
          ? new Date(dateStruct.updatedMin)
          : undefined;
      dateStruct.dateFinished = new Date(dateStruct.dateFinished);

      Log.log(`Parsed execution params:`);
      return dateStruct;
    }

    Log.log("No cached execution params found");
    return undefined;
  }
}
