import { GetEvents } from "./checks/get-events";
import { LogLevel, Log } from "./checks/log";
import { EventUtil } from "./checks/event-util";

/**
   * TODO high level plan for defrag
   *
   * need to know constraints
   * - what meetings need to move / can move
   *   - OOO meetings
   *   - conflicted meetings
   *   - o/w all 1:1s
   * - what optional meeting destinations there are (from my cal and theirs)
   *   - ✅ thus need to know working hours
   * - if a meeting is a recurring meeting, need to know cadence so i can understand how much it can move
   *   - eg weekly 1:1s should only move +/- 1 day; 👌 I can just use presence of "recurringEventId" as a rough first pass.
   *          for more thorough i could fetch the actual event and then parse the recurrenc rule:
   *            "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=FR"],
   *          not super important to get this precise. wondering if there's some way to improve this so it isn't so manual
   *          to get the details but that's OK for now. it limits some options but probably not by too much.
   *          practically speaking being able to shift by +/- 1 day is decent, for biweekly i'd allow like +/-2 i guess
   *
   * need to supply scoring function
   * - negative points
   *  - [day] if longer than 2hrs of meetings
   *  - [day] if gap between meetings
   *  - [week] if meetings are not balanced across days
   * - positive points
   *  - [day] more focus time
   * 
   * 
   * === rough simulated annealing approach
   * 
   * need some repr of overall schedule
   * need list of meetings to place
   * for each meeting, need list of what potential openings it can be placed in
   *  or including their availability and mine
   * need some easy way to compute cost func
   *  in future: incl their cost func as well
   * need some easy way to compute "neighbors"
   * 
   * do i need to do a compact framing of the problem? or can i just use the objs
   * 
   * 24 hours * 2 slots per hour * 7 days = 336 potential meeting slots
   *  this is a pretty verbose framing... hm not terrible i guess but not great
   * mapping meeting to desired timeslot is pretty easy, just {id: number} map
   * maybe mapping to availability is as simple as {id: set(number)}
   *  but how to easy update when i move something; 
   *  i guess just 
   *  foreach moveableMeeting id; do prune takenTimeslot from  availability[id]
   *  but if you want to go _backwards_ here, that's no good
   * so you need 
   *    originalAvailabilities {meeting id: set(number)}
   *    currentAvailabilities  {meeting id: set(number)}
   * if i move meeting x from time a-->b
   *    for all moveablemeetings
   *      if a in originalAvailabilities[id]
   *        currentAvailabilities[id].add(a)
   * ugh that's pretty messy, every time you make a change you iter over all meetings
   * not totally terrible but very inefficient
   * what would make that faster.
   * could just keep track of 
   *  newlyTakenTimeslots: set(number)
   * and use originalAvailabilities when picking nieghbors, but keep selecting randomly
   *  when you check if taken?
   * that works but if a meeting has no actual avails you infinite loop...
   * so i think you need multiple maps?
   * 
   *  [nope dont need] originalAvailabilities {meeting id: set(number)}
   *  currentAvailabilities  {meeting id: set(number)}
   *  timeslotToMeetingOriginalAvailability     {number: set(meeting id)}
   *  moveableMeetings set(meeting id)
   * 
   * so now if you move meeting x from time a --> b
   *    since a freed up you do; timeslotToMeetingOriginalAvailability[a].foreach
   *      currentAvail[id].add(a)
   *    also
   *    timeslotToMeetingOriginalAvailability[b].foreach
   *      currentAvail[id].remove(b)
   * 
   * now to choose next neighbor
   *  random (moveable) meeting id
   *    random currentAvail[id] choice
   * 
   * ok so i dont think you actually need original availabilities map, you just need the second two
   * 
   * ok that's reasonably compact; 336 potential meeting slots but when i restrict to my actual avail it should
   * shrink a ton, basically 9 hours * 2 slots * 5 days = probably 90 numbers
   * probably only 15 meetings to consider in a week so overhead isnt a huge deal
   * 
   * ok how to do scoring with this repr
   * i guess i also need {number: meeting id}
   * hm that stops working well when i htink about 1hr 1:1s hm
   * the general idea is you could just iterate over keys in sorted order
   * could easily get a sense of gaps
   * how to measure meetings per day? just segment out numbers i suppose
   * 
   * something like assignedTimeslots {number: meeting id}
   * 
   * do i need to keep track of meetings not assigned yet?
   * or will every meeting have a assignment to start
   * i think thats mostly feasible but i think in some cases it wont be
   * 
   * ok how to do scoring
   * if i just had meeting[] in sorted starttime order wouldnt be too bad
   * easy to detect gaps
   * reasonable to get meeting load per day
   * semi difficult to get focus time
   * 
   * maybe i could equivalently just do {timeslot : meeting} mapping
   * and have sorted ordering for traversal
 * 
 * 
 * 
 */

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WorkingHours {
  export type TimeRange = {
    startTime: number;
    endTime: number;
  };

  // TODO cache this per email
  export function estimateWorkingHours(email: string): WorkingHours.TimeRange {
    const today = new Date();
    const lookBack = new Date(today);
    lookBack.setMonth(lookBack.getMonth() - 3);

    const events = GetEvents.getEventsForDateRangeCustomCalendar(
      lookBack,
      today,
      email,
      undefined,
      undefined,
      true
    );

    const relevantEvents = events.filter((event) => {
      return (
        event.eventType === "focusTime" ||
        (event.eventType === "default" &&
          event.summary?.includes("Focus Time (via Clockwise)")) ||
        (event.eventType === "default" &&
          EventUtil.didRSVPYes(event, email) &&
          EventUtil.doAllAttendeesHaveSameBusinessEmailDomain(event.attendees))
      );
    });
    // relevantEvents.forEach((event) => {
    //   console.log(`${event.summary}`);
    // });

    // Convert events to tuples of (event, startTimeOfDay, endTimeOfDay)
    const eventTuples = relevantEvents.map((event) => {
      const startTimeOfDay = getTimeOfDay(new Date(event.start!.dateTime!));
      const endTimeOfDay = getTimeOfDay(new Date(event.end!.dateTime!));
      return { event, startTimeOfDay, endTimeOfDay };
    });

    // Sort tuples by start time and end time
    const sortedByStartTime = eventTuples
      .slice()
      .sort((a, b) => a.startTimeOfDay - b.startTimeOfDay);
    const sortedByEndTime = eventTuples
      .slice()
      .sort((a, b) => a.endTimeOfDay - b.endTimeOfDay);

    // Calculate the 10th percentile for start time and 90th percentile for end time
    const p10Index = Math.floor(sortedByStartTime.length * 0.1);
    const p90Index = Math.floor(sortedByEndTime.length * 0.9);

    // Get the 10th percentile start time and 90th percentile end time
    const p10StartTime = sortedByStartTime[p10Index].startTimeOfDay;
    const p90EndTime = sortedByEndTime[p90Index].endTimeOfDay;

    Log.log(`10th percentile start time: ${formatTime(p10StartTime)}`);
    Log.log(`90th percentile end time: ${formatTime(p90EndTime)}`);

    return {
      startTime: p10StartTime,
      endTime: p90EndTime,
    };
  }

  export function getTimeOfDay(date: Date): number {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

  export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
  }
}
