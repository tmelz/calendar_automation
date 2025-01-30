import { CheckTypes } from "./check-types";
import { LogLevel, Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ModifyEvent {
  export enum Direction {
    PREFIX,
    SUFFIX,
  }

  export function eventLabelOrBlurbNeedsAddingOrTweaking(
    event: GoogleAppsScript.Calendar.Schema.Event,
    label: string | undefined,
    blurb: string,
    deprecatedBlurbs: string[] = [],
    deprecatedLabels: string[] | undefined = []
  ): boolean {
    const needsLabel = label !== undefined;
    const summaryIncludesLabel =
      label !== undefined && event.summary?.includes(label) === true;
    const summaryIncludesDeprecatedLabel = deprecatedLabels.some((needle) =>
      event.summary?.includes(needle)
    );

    if (
      (needsLabel && !summaryIncludesLabel) ||
      summaryIncludesDeprecatedLabel
    ) {
      return true;
    }

    const descriptionIncludesBlurb =
      event.description?.includes(blurb) === true;
    const descriptionIncludesDeprecatedBlurb = deprecatedBlurbs.some((needle) =>
      event.description?.includes(needle)
    );

    if (descriptionIncludesBlurb && !descriptionIncludesDeprecatedBlurb) {
      return false;
    }

    // either !descriptionIncludesBlurb or descriptionIncludesDeprecatedBlurb
    return true;
  }

  export function hasTitleLabelOrDescriptionBlurb(
    event: GoogleAppsScript.Calendar.Schema.Event,
    label: string,
    blurb: string,
    deprecatedBlurbs: string[] = []
  ): boolean {
    if (event.summary?.includes(label)) {
      return true;
    }

    if (
      event.description?.includes(blurb) ||
      deprecatedBlurbs.some((needle) => event.description?.includes(needle))
    ) {
      return true;
    }

    return false;
  }

  export function modifyTitle(
    modificationType: CheckTypes.ModificationType,
    event: GoogleAppsScript.Calendar.Schema.Event,
    label: string | undefined,
    direction: ModifyEvent.Direction,
    deprecatedLabels: string[] = []
  ): string {
    switch (modificationType) {
      case CheckTypes.ModificationType.YES_CHANGE_COLOR: {
        throw new Error("Color modification type not expected here");
      }
      case CheckTypes.ModificationType.YES_REMOVE_LABEL: {
        const oldTitle = event.summary;
        if (label !== undefined) {
          event.summary = (event.summary ?? "").replace(label, "");
        }

        deprecatedLabels.forEach((needle) => {
          event.summary = (event.summary ?? "").replace(needle, "");
        });

        const logEntry = `🧹 Modifying event to remove title label: "${oldTitle}" ==> "${event.summary}"`;
        Log.log(logEntry);
        return logEntry;
      }
      case CheckTypes.ModificationType.YES_ADD_LABEL: {
        const needsLabel = label !== undefined;
        const summaryIncludesLabel =
          label !== undefined && event.summary?.includes(label) === true;
        const summaryIncludesDeprecatedLabel = deprecatedLabels.some((needle) =>
          event.summary?.includes(needle)
        );

        const oldTitle = event.summary;
        let removeDeprecatedLabelsLog = undefined;

        if (summaryIncludesDeprecatedLabel) {
          deprecatedLabels.forEach((needle) => {
            event.summary = (event.summary ?? "").replace(needle, "");
          });
          removeDeprecatedLabelsLog = `🧹 updating title to remove deprecated labels: "${oldTitle}" ==> "${event.summary}"`;
        }

        if (needsLabel && !summaryIncludesLabel) {
          if (direction === ModifyEvent.Direction.PREFIX) {
            event.summary = label + (event.summary ?? "");
          } else {
            event.summary = (event.summary ?? "") + label;
          }

          const logEntry =
            (removeDeprecatedLabelsLog === undefined
              ? ""
              : removeDeprecatedLabelsLog + "\n") +
            `📝 updating title to add label: "${oldTitle}" ==> "${event.summary}"`;
          Log.log(logEntry);
          return logEntry;
        } else {
          const logEntry =
            (removeDeprecatedLabelsLog === undefined
              ? ""
              : removeDeprecatedLabelsLog + "\n") +
            `👎 not updating meeting title,` +
            (label === undefined
              ? " no label required for this check"
              : ` already contains desired label "${label}"`);
          Log.log(logEntry);
          return logEntry;
        }
      }
    }
  }

  export function modifyDescription(
    modificationType: CheckTypes.ModificationType,
    event: GoogleAppsScript.Calendar.Schema.Event,
    blurb: string,
    deprecatedBlurbs: string[] = []
  ): string {
    switch (modificationType) {
      case CheckTypes.ModificationType.YES_CHANGE_COLOR: {
        throw new Error("Color modification type not expected here");
      }
      case CheckTypes.ModificationType.YES_REMOVE_LABEL: {
        const oldDescription = event.description;
        event.description = (event.description ?? "").replace(blurb, "");

        deprecatedBlurbs.forEach((needle) => {
          event.description = (event.description ?? "").replace(needle, "");
        });

        const logEntry = `🧹 Modifying event to remove description blurb: "${oldDescription}" ==> "${event.description}"`;
        Log.log(logEntry);
        return logEntry;
      }
      case CheckTypes.ModificationType.YES_ADD_LABEL: {
        const includesBlurb = event.description?.includes(blurb);
        const includesDeprecatedBlurb = deprecatedBlurbs.some((needle) =>
          event.description?.includes(needle)
        );
        if (includesBlurb) {
          return `👎 not updating meeting description, description contains desired blurb "${blurb}" (or one of deprecated blurbs: ${deprecatedBlurbs})`;
        } else if (includesDeprecatedBlurb) {
          const oldDescription = event.description ?? "";

          deprecatedBlurbs.forEach((needle) => {
            event.description = (event.description ?? "").replace(needle, "");
          });

          event.description = event.description + '\n' + blurb;
          const logEntry = `📝 updating description to remove deprecated blurbs then add new one: "${oldDescription}" ==> "${event.description}"`;
          Log.log(logEntry);
          return logEntry;
        } else {
          const oldDescription = event.description ?? "";
          event.description = oldDescription + blurb;

          const logEntry = `📝 updating description to add blurb: "${oldDescription}" ==> "${event.description}"`;
          Log.log(logEntry);
          return logEntry;
        }
      }
    }
  }
}
