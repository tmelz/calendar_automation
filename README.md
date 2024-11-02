[![CI](https://github.com/tmelz/calendar_automation/actions/workflows/ci.yml/badge.svg)](https://github.com/tmelz/calendar_automation/actions/workflows/ci.yml)[![codecov](https://codecov.io/github/tmelz/calendar_automation/graph/badge.svg?token=RZUDBKNLY6)](https://codecov.io/github/tmelz/calendar_automation)

Note: I'm not maintaining Main as releasable from every commit, please checkout this commit as the last endorsed-as-stable; In the near future I'll add more polish via something like release tags
https://github.com/tmelz/calendar_automation/commit/098d500a6517a1ca4d3dfd99d680c4fa21b9aa87

# Install

1. Install [clasp](https://github.com/google/clasp)
   1. `npm install -g @google/clasp`
   2. Enable the Google Apps Script API via [your settings](https://script.google.com/home/usersettings)
   3. Run `clasp login`
2. `git clone https://github.com/tmelz/calendar_automation.git && cd calendar_automation`
3. `npm install`
4. `npm test` to verify the tests are passing
5. `clasp create --type webapp` to create your apps script project
6. `clasp push` to push this code to your project
7. `clasp deploy` to publish the webapp; you can also open the project in your [apps script home](https://script.google.com/home) and deploy using that UI. You may prefer to alter the access to be "only myself".
8. Via the app script UI, open "Manage deployments" under "Deploy" and find the URL of the deployed webapp. Open it and you can one-click install in the webapp once you authorize with your Google Calendar

# Features

- ⏳ Start all 1:1 meetings at 5 minutes past the hour automatically; this is the best setting for frequent meetings.
- 🚨 Automatically detect if someone is OOO for 1:1s, even if they RSVP'd yes. Flagged in the meeting title. Takes into account all day OOO and specific time range OOO (e.g. 1-2pm).
- ⚔️ Detects when someone has RSVPd to another event at the same time as a 1:1, and flags in the meeting title. Avoids last minute "I'm double booked" DMs!
- 👻 Detect if someone in a 1:1 is no longer an employee
- 🔁 Runs automatically, daily and whenever your calendar changes

# Warning

This tool automatically modifies your calendar. That comes with certain risks. I've taken many precautions to mitigate the risk, but please be aware that this is not a bulletproof tool and there's a chance it could mess up some of your calendar. Mitigations are listed below:

- 🛡️ Unit tests run against real world data from my calendar
- 🛑 The tool only operates on the meetings occurring this week and the next complete week. Meaning that it will never modify meetings further than 2 weeks out.
- 👮‍♂️ There's a hard cap on the number of meetings it can modify in one run (30), to prevent any kind of runaway issue.

# Dry run

1. After `clasp push`, open `install.gs` in the Apps script IDE and run `runDailyChecksDryRun()`
2. OR deploy the webapp and open it, there will be an interactive way to dry run

# Appendix: interesting references and bugs

- [Clockwise Detecting holidays](https://support.getclockwise.com/article/91-how-can-i-have-a-holiday-word-in-an-event-without-triggering-ooo-time)
- [GCal API bug](https://issuetracker.google.com/issues/204791550) for modifying someone elses event
- [Google apps script](https://developers.google.com/apps-script/guides/client-verification) verification
