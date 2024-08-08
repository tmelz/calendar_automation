import { jest } from "@jest/globals";
import { ModifyEvent } from "../../src/checks/modify-event";
import { CheckTypes } from "../../src/checks/check-types";

describe("ModifyEvent", () => {
  let mockEvent: GoogleAppsScript.Calendar.Schema.Event;

  beforeEach(() => {
    mockEvent = {
      summary: "Meeting",
      description: "Discuss project",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("modifyTitle", () => {
    it("should remove label from the title", () => {
      ModifyEvent.modifyTitle(
        CheckTypes.ModificationType.YES_REMOVE_LABEL,
        mockEvent,
        "Meeting",
        ModifyEvent.Direction.PREFIX
      );
      expect(mockEvent.summary).toBe("");
    });

    it("should add label to the title as a prefix", () => {
      ModifyEvent.modifyTitle(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        "Project - ",
        ModifyEvent.Direction.PREFIX
      );
      expect(mockEvent.summary).toBe("Project - Meeting");
    });

    it("should add label to the title as a suffix", () => {
      ModifyEvent.modifyTitle(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        " - Project",
        ModifyEvent.Direction.SUFFIX
      );
      expect(mockEvent.summary).toBe("Meeting - Project");
    });

    it("should not update title if it already contains the label", () => {
      mockEvent.summary = "Project - Meeting";
      ModifyEvent.modifyTitle(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        "Project - ",
        ModifyEvent.Direction.PREFIX
      );
      expect(mockEvent.summary).toBe("Project - Meeting");
    });
  });

  describe("modifyDescription", () => {
    it("should remove blurb from the description", () => {
      ModifyEvent.modifyDescription(
        CheckTypes.ModificationType.YES_REMOVE_LABEL,
        mockEvent,
        "Discuss project"
      );
      expect(mockEvent.description).toBe("");
    });

    it("should remove deprecated blurb from the description", () => {
      ModifyEvent.modifyDescription(
        CheckTypes.ModificationType.YES_REMOVE_LABEL,
        mockEvent,
        "foobar",
        ["Discuss project"]
      );
      expect(mockEvent.description).toBe("");
    });

    it("should add blurb to the description", () => {
      ModifyEvent.modifyDescription(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        " - Next steps"
      );
      expect(mockEvent.description).toBe("Discuss project - Next steps");
    });

    it("should not update description if it already contains the blurb or deprecated blurbs", () => {
      mockEvent.description = "Discuss project - Next steps";
      ModifyEvent.modifyDescription(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        "Next steps",
        ["Old blurb"]
      );
      expect(mockEvent.description).toBe("Discuss project - Next steps");
    });

    it("should replace deprecated blurb with new blurb if YES_ADD_LABEL", () => {
      mockEvent.description = "Discuss project - Next steps";
      ModifyEvent.modifyDescription(
        CheckTypes.ModificationType.YES_ADD_LABEL,
        mockEvent,
        "new blurb not present",
        ["Discuss project"]
      );
      expect(mockEvent.description).toBe(
        " - Next steps" + "new blurb not present"
      );
    });
  });

  describe("hasTitleLabelOrDescriptionBlurb", () => {
    it("should return true if the title contains the label", () => {
      mockEvent.summary = "Project - Meeting";
      const result = ModifyEvent.hasTitleLabelOrDescriptionBlurb(
        mockEvent,
        "Project - ",
        "Discuss project"
      );
      expect(result).toBe(true);
    });

    it("should return true if the description contains the blurb", () => {
      mockEvent.description = "Discuss project - Next steps";
      const result = ModifyEvent.hasTitleLabelOrDescriptionBlurb(
        mockEvent,
        "Project - ",
        "Discuss project"
      );
      expect(result).toBe(true);
    });

    it("should return true if the description contains a deprecated blurb", () => {
      mockEvent.description = "Old blurb - Next steps";
      const result = ModifyEvent.hasTitleLabelOrDescriptionBlurb(
        mockEvent,
        "Project - ",
        "Discuss project",
        ["Old blurb"]
      );
      expect(result).toBe(true);
    });

    it("should return false if neither the title nor the description contains the label or blurb", () => {
      const result = ModifyEvent.hasTitleLabelOrDescriptionBlurb(
        mockEvent,
        "Project - ",
        "Next steps"
      );
      expect(result).toBe(false);
    });
  });
});
