import { jest } from "@jest/globals";
import { CheckColor } from "../../src/checks/check-color";
import {
  myOneOnOneEvent,
  focusTimeEvent,
  holdEvent,
  teamEvent,
  adhocEvent,
  theirOOOSpecificTimeEvent,
} from "./event-data";
import { CheckTypes } from "../../src/checks/check-types";

describe("getCategoryForEvent", () => {
  it("should return Category.OneOnOne for a one-on-one event", () => {
    const result = CheckColor.getCategoryForEvent(myOneOnOneEvent);
    expect(result).toBe(CheckColor.Category.OneOnOne);
  });

  it("should return Category.ExternalAttendees for an event with external attendees", () => {
    const event = {
      ...myOneOnOneEvent,
      attendees: [
        {
          responseStatus: "accepted",
          self: true,
          organizer: true,
          email: "foo@block.xyz",
        },
        { email: "bar@example.com", responseStatus: "needsAction" },
      ],
    };
    const result = CheckColor.getCategoryForEvent(event);
    expect(result).toBe(CheckColor.Category.ExternalAttendees);
  });

  it("should return Category.FocusTime for a focus time event", () => {
    const result = CheckColor.getCategoryForEvent(focusTimeEvent);
    expect(result).toBe(CheckColor.Category.FocusTime);
  });

  it("should return Category.Hold for an event with no attendees", () => {
    const result = CheckColor.getCategoryForEvent(holdEvent);
    expect(result).toBe(CheckColor.Category.Hold);
  });

  it("should return Category.TeamSync for a team sync event", () => {
    const result = CheckColor.getCategoryForEvent(teamEvent);
    expect(result).toBe(CheckColor.Category.TeamSync);
  });

  it("should return Category.AdHoc for an ad-hoc event", () => {
    const result = CheckColor.getCategoryForEvent(adhocEvent);
    expect(result).toBe(CheckColor.Category.AdHoc);
  });

  it("should return Category.OutOfOffice for an out-of-office event", () => {
    const result = CheckColor.getCategoryForEvent(theirOOOSpecificTimeEvent);
    expect(result).toBe(CheckColor.Category.OutOfOffice);
  });

  //   it("should return Category.Other for any other type of event", () => {
  //     const result = CheckColor.getCategoryForEvent(otherEvent);
  //     expect(result).toBe(Category.Other);
  //   });
});

describe("modifyEventLocally", () => {
  it("correctly adds the right color id", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: undefined,
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.Lavender,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBe(
      CheckColor.mapColorToColorId(CheckColor.Color.Lavender)
    );
  });

  it("changes color id", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.Lavender,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBe(
      CheckColor.mapColorToColorId(CheckColor.Color.Lavender)
    );
  });

  it("removes color id if NoOp set", () => {
    const event = {
      ...myOneOnOneEvent,
      colorId: "3",
    };
    CheckColor.modifyEventLocally(
      event,
      CheckTypes.ModificationType.YES_CHANGE_COLOR,
      {
        [CheckColor.Category.OneOnOne]: CheckColor.Color.NoOp,
      } as CheckColor.Settings
    );
    expect(event.colorId).toBe(undefined);
  });
});
