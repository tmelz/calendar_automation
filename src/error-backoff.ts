import { Log } from "./checks/log";

// Constants for error backoff

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ErrorBackoff {
  export const ERROR_BACKOFF_DURATION_MS = 30 * 1000; // 30 seconds
  export const LAST_ERROR_TIMESTAMP_KEY = "lastErrorTimestamp";
  /**
   * Check if we should backoff based on the last error timestamp
   * @returns true if we should backoff (skip execution), false otherwise
   */
  export function shouldBackoff(): boolean {
    const userProperties = PropertiesService.getUserProperties();
    const lastErrorTimestamp = userProperties.getProperty(
      ErrorBackoff.LAST_ERROR_TIMESTAMP_KEY
    );

    if (!lastErrorTimestamp) {
      return false;
    }

    const lastErrorTime = parseInt(lastErrorTimestamp, 10);
    const currentTime = Date.now();

    // Check if we're within the backoff window
    const shouldBackoff =
      currentTime - lastErrorTime < ErrorBackoff.ERROR_BACKOFF_DURATION_MS;

    if (shouldBackoff) {
      Log.log(
        `⏳ Backing off due to recent error at ${new Date(lastErrorTime).toISOString()} (${Math.round((currentTime - lastErrorTime) / 1000)}s ago)`
      );
    }

    return shouldBackoff;
  }

  /**
   * Record that an error occurred now
   * @param error The error that occurred
   */
  export function recordError(error: Error): void {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(
      ErrorBackoff.LAST_ERROR_TIMESTAMP_KEY,
      Date.now().toString()
    );
    Log.log(`⚠️ Recording error for backoff: ${error.message}`);

    // Log the user for easier debugging
    try {
      const userEmail = Session.getActiveUser().getEmail();
      Log.log(`Error occurred for user: ${userEmail}`);
    } catch (e) {
      Log.log("Could not log user email during error handling");
    }
  }

  /**
   * Try to execute a function with error backoff
   * @returns true if the function executed, false if it was skipped due to backoff
   */
  export function tryExecute(func: () => void): boolean {
    // Check if we should backoff first
    if (ErrorBackoff.shouldBackoff()) {
      Log.log("Exiting early due to backoff period");
      return false;
    }

    try {
      func();
      return true;
    } catch (error) {
      // Record the error timestamp
      ErrorBackoff.recordError(error as Error);

      // Rethrow the error
      throw error;
    }
  }
}
