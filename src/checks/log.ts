// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Log {
  export let hook: ((message: string) => void) | undefined = undefined;
  export let stackMin: number | undefined = undefined;

  // https://x.com/sophiebits/status/1058448900460138497/photo/1
  // Extra feature, cache the baseline log level so that everything
  // is left shifted as much as possible. Reset the cache whenever we
  // get a new logPhase.
  export function log(message: string, skipIndent: boolean = false): void {
    let messagePrefix = "";

    if (!skipIndent) {
      let indentLevel = 0;
      const stackHeight = new Error().stack?.match(/\n/g)?.length;
      if (stackHeight === undefined) {
        indentLevel = 0;
      } else {
        if (Log.stackMin === undefined) {
          Log.stackMin = stackHeight;
        }
        indentLevel = Math.max(stackHeight - Log.stackMin, 0);
        messagePrefix = "  ".repeat(indentLevel);
      }
    }

    const updatedMessage = messagePrefix + message;
    if (Log.hook !== undefined) {
      Log.hook(updatedMessage);
    }
    Logger.log(updatedMessage);
  }

  export function logPhase(phase: string): void {
    const width = 90;
    const separator = "=".repeat(width);
    const paddedPhase = `${phase}`
      .padStart((phase.length + width) / 2, " ")
      .padEnd(60, " ");
    Log.log(separator, true);
    Log.log(paddedPhase, true);
    Log.log(separator, true);

    // Reset
    Log.stackMin = undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace LogLevel {
  export const DEBUG: boolean = false;
}
