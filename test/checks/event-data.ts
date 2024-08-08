export const myOneOnOneEvent: GoogleAppsScript.Calendar.Schema.Event = {
  conferenceData: {
    conferenceId: "fqq-gjxw-aza",
    conferenceSolution: {
      name: "Google Meet",
      key: { type: "hangoutsMeet" },
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
    },
    entryPoints: [
      {
        entryPointType: "video",
        uri: "https://meet.google.com/fqq-gjxw-aza",
        label: "meet.google.com/fqq-gjxw-aza",
      },
      {
        uri: "https://tel.meet/fqq-gjxw-aza?pin=6720550232487",
        entryPointType: "more",
        pin: "6720550232487",
      },
      {
        uri: "tel:+1-402-410-2193",
        label: "+1 402-410-2193",
        entryPointType: "phone",
        regionCode: "US",
        pin: "582364017",
      },
    ],
  },
  attendees: [
    {
      responseStatus: "accepted",
      self: true,
      organizer: true,
      email: "john.doe@example.com",
    },
    { email: "jane.doe@example.com", responseStatus: "needsAction" },
  ],
  organizer: { email: "john.doe@example.com", self: true },
  kind: "calendar#event",
  summary: "John / Jane",
  eventType: "default",
  etag: '"3443561990988000"',
  iCalUID: "3r8sfvmsvhprumnkboqba3ibrl@google.com",
  id: "3r8sfvmsvhprumnkboqba3ibrl",
  description: "lorem ipsum",
  start: {
    dateTime: "2024-07-26T14:00:00-07:00",
    timeZone: "America/Los_Angeles",
  },
  hangoutLink: "https://meet.google.com/fqq-gjxw-aza",
  creator: { email: "john.doe@example.com", self: true },
  reminders: { useDefault: true },
  htmlLink:
    "https://www.google.com/calendar/event?eid=M3I4c2Z2bXN2aHBydW1ua2JvcWJhM2licmwgam9obi5kb2VAZXhhbXBsZS5jb20",
  guestsCanModify: true,
  updated: "2024-07-24T00:29:55.494Z",
  colorId: "10",
  created: "2024-07-24T00:29:51.000Z",
  status: "confirmed",
  sequence: 1,
  end: {
    timeZone: "America/Los_Angeles",
    dateTime: "2024-07-26T14:30:00-07:00",
  },
};

export const myOneOnOneEventWithOOOConflict: GoogleAppsScript.Calendar.Schema.Event =
  {
    sequence: 1,
    conferenceData: {
      conferenceId: "ucb-rubd-nxb",
      entryPoints: [
        {
          entryPointType: "video",
          uri: "https://meet.google.com/ucb-rubd-nxb",
          label: "meet.google.com/ucb-rubd-nxb",
        },
        {
          entryPointType: "more",
          pin: "9466848464160",
          uri: "https://tel.meet/ucb-rubd-nxb?pin=9466848464160",
        },
        {
          regionCode: "US",
          label: "+1 484-424-4335",
          uri: "tel:+1-484-424-4335",
          entryPointType: "phone",
          pin: "808220768",
        },
      ],
      conferenceSolution: {
        name: "Dummy Conference Solution",
        iconUri:
          "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
        key: {
          type: "hangoutsMeet",
        },
      },
    },
    kind: "calendar#event",
    updated: "2024-07-25T19:01:52.404Z",
    iCalUID: "3oaa99v2opl51tck7631sis1uu@google.com",
    htmlLink:
      "https://www.google.com/calendar/event?eid=M29hYTk5djJvcGw1MXRjazc2MzFzaXMxdXUgdG1lbGxvckBibG9jay54eXo",
    created: "2024-07-25T19:01:16.000Z",
    attendees: [
      {
        responseStatus: "needsAction",
        email: "them@example.com",
      },
      {
        self: true,
        email: "me@example.com",
        organizer: true,
        responseStatus: "accepted",
      },
    ],
    eventType: "default",
    etag: '"3443868224808000"',
    start: {
      timeZone: "America/Los_Angeles",
      dateTime: "2024-07-31T14:35:00-07:00",
    },
    guestsCanModify: true,
    colorId: "10",
    id: "3oaa99v2opl51tck7631sis1uu",
    description: "lorem ipsum",
    status: "confirmed",
    summary: "Dummy Summary [⚠️ +5m start]",
    reminders: {
      useDefault: true,
    },
    organizer: {
      self: true,
      email: "me@example.com",
    },
    creator: {
      self: true,
      email: "me@example.com",
    },
    hangoutLink: "https://meet.google.com/ucb-rubd-nxb",
    end: {
      dateTime: "2024-07-31T15:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
  };

export const theirIrrelevantEvent: GoogleAppsScript.Calendar.Schema.Event = {
  htmlLink:
    "https://www.google.com/calendar/event?eid=N2M4cXZuZ25oZWw4dDVscjltbWFiaW5uam9fMjAyNDA3MzAgbHVjYXNjb250aUBibG9jay54eXo",
  updated: "2024-06-17T14:30:50.503Z",
  id: "7c8qvngnhel8t5lr9mmabinnjo_20240730",
  creator: { self: true, email: "them@example.com" },
  originalStartTime: { date: "2024-07-30" },
  sequence: 0,
  organizer: { email: "them@example.com", self: true },
  eventType: "workingLocation",
  end: { date: "2024-07-31" },
  visibility: "public",
  etag: '"3437269301006000"',
  iCalUID: "7c8qvngnhel8t5lr9mmabinnjo@google.com",
  reminders: { useDefault: false },
  recurringEventId: "7c8qvngnhel8t5lr9mmabinnjo",
  transparency: "transparent",
  kind: "calendar#event",
  created: "2024-06-17T14:30:50.000Z",
  workingLocationProperties: { homeOffice: {}, type: "homeOffice" },
  start: { date: "2024-07-30" },
  summary: "Dummy Summary",
  status: "confirmed",
};

export const theirOOOAllDayEvent: GoogleAppsScript.Calendar.Schema.Event = {
  start: { date: "2024-07-31" },
  organizer: { self: true, email: "them@example.com" },
  creator: { email: "them@example.com", self: true },
  id: "hak26n2i6n41k5k1r730jgch94",
  summary: "OOO- Automated by Workday",
  etag: '"3438682892816000"',
  end: { date: "2024-07-31" },
  kind: "calendar#event",
  reminders: { useDefault: false },
  status: "confirmed",
  eventType: "default",
  sequence: 0,
  created: "2024-06-25T18:50:46.000Z",
  htmlLink:
    "https://www.google.com/calendar/event?eid=aGFrMjZuMmk2bjQxazVrMXI3MzBqZ2NoOTQgbHVjYXNjb250aUBibG9jay54eXo",
  iCalUID: "hak26n2i6n41k5k1r730jgch94@google.com",
  description:
    "This calendar invite was automatically generated from Workday. Any changes to this calendar invite will NOT be reflected in Workday. Corrections or removals of Time Off events in Workday will automatically update your calendar. For any issues regarding these invites, please contact workday-support@",
  updated: "2024-06-25T18:50:46.408Z",
};

export const theirOOOLongTermMultiDayEvent: GoogleAppsScript.Calendar.Schema.Event =
  {
    id: "7306k9rr6jr0joml3v0a1uj0pg",
    // outOfOfficeProperties: {
    //   declineMessage: "Declined because I am out of office",
    //   autoDeclineMode: "declineAllConflictingInvitations"
    // },
    updated: "2024-04-26T21:43:28.288Z",
    reminders: { useDefault: true },
    end: {
      dateTime: "2024-09-07T00:00:00-04:00",
      timeZone: "America/New_York",
    },
    created: "2024-04-26T21:43:28.000Z",
    visibility: "public",
    iCalUID: "7306k9rr6jr0joml3v0a1uj0pg@google.com",
    summary: "Out of office - Parental Leave (go/them-pto)",
    etag: '"3428335616576000"',
    eventType: "outOfOffice",
    htmlLink:
      "https://www.google.com/calendar/event?eid=NzMwNms5cnI2anIwam9tbDN2MGExdWowcGcgamFzbWluZWpAc3F1YXJldXAuY29t",
    start: {
      dateTime: "2024-05-06T00:00:00-04:00",
      timeZone: "America/New_York",
    },
    sequence: 0,
    kind: "calendar#event",
    status: "confirmed",
    organizer: { self: true, email: "them@example.com" },
    creator: { self: true, email: "them@example.com" },
  };

export const theirOOOSpecificTimeEvent: GoogleAppsScript.Calendar.Schema.Event =
  {
    creator: { self: true, email: "them@example.com" },
    visibility: "public",
    htmlLink:
      "https://www.google.com/calendar/event?eid=M2ljZXJjam52azJuZzhia3NtNHV1cnMxcjAgdG1lbGxvckBibG9jay54eXo",
    updated: "2024-07-26T00:17:37.051Z",
    organizer: { email: "them@example.com", self: true },
    reminders: { useDefault: false },
    summary: "Out of office",
    end: {
      dateTime: "2024-07-31T18:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    start: {
      timeZone: "America/Los_Angeles",
      dateTime: "2024-07-31T13:00:00-07:00",
    },
    id: "3icercjnvk2ng8bksm4uurs1r0",
    created: "2024-07-26T00:17:37.000Z",
    status: "confirmed",
    sequence: 0,
    etag: '"3443906114102000"',
    iCalUID: "3icercjnvk2ng8bksm4uurs1r0@google.com",
    eventType: "outOfOffice",
    // Note these properties aren't in the typescript schema hm
    // outOfOfficeProperties: {
    //   autoDeclineMode: "declineAllConflictingInvitations",
    //   declineMessage: "Declined because I am out of office"
    // }
  };

export const theirOverlappingButNonOOOEvent: GoogleAppsScript.Calendar.Schema.Event =
  {
    creator: { self: true, email: "them@example.com" },
    visibility: "public",
    htmlLink:
      "https://www.google.com/calendar/event?eid=M2ljZXJjam52azJuZzhia3NtNHV1cnMxcjAgdG1lbGxvckBibG9jay54eXo",
    updated: "2024-07-26T00:17:37.051Z",
    organizer: { email: "them@example.com", self: true },
    reminders: { useDefault: false },
    summary: "this event overlaps but isnt type OOO",
    end: {
      dateTime: "2024-07-31T18:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    start: {
      timeZone: "America/Los_Angeles",
      dateTime: "2024-07-31T13:00:00-07:00",
    },
    id: "3icercjnvk2ng8bksm4uurs1r0",
    created: "2024-07-26T00:17:37.000Z",
    status: "confirmed",
    sequence: 0,
    etag: '"3443906114102000"',
    iCalUID: "3icercjnvk2ng8bksm4uurs1r0@google.com",
    eventType: "default",
  };

export const oneOnOneOwnedByTHem: GoogleAppsScript.Calendar.Schema.Event = {
  created: "2024-07-29T22:44:42.000Z",
  organizer: { email: "them@example.com" },
  start: {
    dateTime: "2024-07-30T16:05:00-07:00",
    timeZone: "America/Los_Angeles",
  },
  hangoutLink: "https://meet.google.com/hwj-aucm-pch",
  htmlLink:
    "https://www.google.com/calendar/event?eid=MTc2MGVsZTFwMDJrYXF0aDZhamZhZHNha2ggdG1lbGxvckBibG9jay54eXo",
  guestsCanModify: true,
  creator: { email: "them@example.com" },
  reminders: { useDefault: true },
  sequence: 1,
  updated: "2024-07-30T00:34:19.889Z",
  description: "foobar",
  iCalUID: "1760ele1p02kaqth6ajfadsakh@google.com",
  eventType: "default",
  conferenceData: {
    conferenceId: "hwj-aucm-pch",
    entryPoints: [
      {
        label: "meet.google.com/hwj-aucm-pch",
        uri: "https://meet.google.com/hwj-aucm-pch",
        entryPointType: "video",
      },
      {
        uri: "https://tel.meet/hwj-aucm-pch?pin=4716159067340",
        pin: "4716159067340",
        entryPointType: "more",
      },
      {
        uri: "tel:+1-862-208-3142",
        label: "+1 862-208-3142",
        pin: "999482054",
        entryPointType: "phone",
        regionCode: "US",
      },
    ],
    conferenceSolution: {
      key: { type: "hangoutsMeet" },
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
      name: "Google Meet",
    },
  },
  colorId: "10",
  kind: "calendar#event",
  summary: "Title",
  end: {
    dateTime: "2024-07-30T16:30:00-07:00",
    timeZone: "America/Los_Angeles",
  },
  status: "confirmed",
  id: "1760ele1p02kaqth6ajfadsakh",
  attendees: [
    {
      organizer: true,
      responseStatus: "accepted",
      email: "them@example.com",
    },
    { responseStatus: "accepted", email: "me@example.com", self: true },
  ],
  etag: '"3444599319778000"',
};
export const myOneOnOneWithPotentialConflict: GoogleAppsScript.Calendar.Schema.Event =
  {
    kind: "calendar#event",
    eventType: "default",
    description:
      "Hey, I wanted to grab time for us to meet for a monthly 1:1. I'm very flexible on day/time within my working hours, so please feel free to make changes or give me feedback. Cheers!\n\n<small><i>[Note from Tim: I've automatically updated this meeting to start +5m. With frequent meetings, this helps me handle action items and take a breather so that I can join fresh and ready to focus. Please reach out with any concerns!]</i><small>",
    summary: "Title",
    iCalUID: "gdiuq1f339lh988lg4kqoe71ag@google.com",
    organizer: {
      self: true,
      displayName: "Me",
      email: "me@example.com",
    },
    sequence: 2,
    reminders: { useDefault: true },
    start: {
      dateTime: "2024-08-02T11:35:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    htmlLink:
      "https://www.google.com/calendar/event?eid=Z2RpdXExZjMzOWxoOTg4bGc0a3FvZTcxYWdfMjAyNDA4MDJUMTgzMDAwWiB0bWVsbG9yQGJsb2NrLnh5eg",
    end: {
      timeZone: "America/Los_Angeles",
      dateTime: "2024-08-02T12:00:00-07:00",
    },
    created: "2022-11-18T00:59:54.000Z",
    creator: {
      email: "me@example.com",
      displayName: "Me",
      self: true,
    },
    attachments: [
      {
        iconLink:
          "https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.document",
        mimeType: "application/vnd.google-apps.document",
        fileUrl:
          "https://docs.google.com/document/d/1osjL_WLKQ1iSMYinJp8OLBN_qv0SKJSIuDeut362dmE/edit",
        fileId: "1osjL_WLKQ1iSMYinJp8OLBN_qv0SKJSIuDeut362dmE",
        title: "Notes - ",
      },
    ],
    recurringEventId: "gdiuq1f339lh988lg4kqoe71ag",
    status: "confirmed",
    hangoutLink: "https://meet.google.com/mxb-vhhc-gzr",
    updated: "2024-07-25T16:07:08.960Z",
    conferenceData: {
      conferenceId: "mxb-vhhc-gzr",
      conferenceSolution: {
        name: "Google Meet",
        iconUri:
          "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
        key: { type: "hangoutsMeet" },
      },
      entryPoints: [
        {
          entryPointType: "video",
          label: "meet.google.com/mxb-vhhc-gzr",
          uri: "https://meet.google.com/mxb-vhhc-gzr",
        },
        {
          pin: "8241637050632",
          uri: "https://tel.meet/mxb-vhhc-gzr?pin=8241637050632",
          entryPointType: "more",
        },
        {
          entryPointType: "phone",
          uri: "tel:+1-219-379-3408",
          label: "+1 219-379-3408",
          pin: "577498364",
          regionCode: "US",
        },
      ],
    },
    etag: '"3443847257920000"',
    guestsCanModify: true,
    originalStartTime: {
      dateTime: "2024-08-02T11:30:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    id: "gdiuq1f339lh988lg4kqoe71ag_20240802T183000Z",
    colorId: "7",
    attendees: [
      {
        self: true,
        responseStatus: "accepted",
        displayName: "Me",
        email: "me@example.com",
        organizer: true,
      },
      {
        displayName: "Them",
        email: "them@example.com",
        responseStatus: "accepted",
      },
    ],
  };

// const theirRandomEvent1: GoogleAppsScript.Calendar.Schema.Event = {
//   description: `<a href="https://docs.google.com/spreadsheets/d/1KtkyWk9RInXyRFB4dPE_2RAlCnqyTCQzbOrtzWWjfcQ/edit#gid=0" target="_blank"><b>SQUARE 2024 DWW SCHEDULE</b></a><ul><li>Week of 1/1</li><li>Week of 1/29</li><li>Week of 3/11</li><li>Week of 4/29</li><li>Week of 6/24</li><li>Week of 7/29</li><li>Week of 9/16</li><li>Week of 11/11</li><li>Week of 12/16</li></ul><br><b>DWW DETAILS</b><br><br><b>WHAT</b><br>Deep work weeks (DWW) are an opportunity to set aside an entire work week where schedules are cleared and individuals have the space to execute on initiatives big and small that might be typically slowed by the regular day to day noise of work such as meetings, stand ups, and events. <br><br><b>WHY</b><br>Even though we are no longer physically in the same space, the pace of swirl has not slowed and there is a feeling that we may be meeting more, not less, frequently. While meetings can be great and help us move our work forward, in addition to helping us feel more connected, they can also lead to exhaustion and a lack of time for deeper, more focused thought and work. Context switching between meetings and deep work can be challenging, so segmented deep work time can be highly beneficial.<br><br><b>GUIDING PRINCIPLES</b><br><ul><li>Deep Work Week is not “No Work Week” or “Quiet Week” and there should be a tangible and measurable output that individuals can provide which contributes to the success of the team’s roadmaps and objectives. We should trust and leverage existing systems (sprint planning, 1-1s) to measure output and should not create new processes. </li><li>It is our responsibility to guard our time and use it wisely to optimize our productivity and productivity of the entire team</li><li>This ensures that all members are empathetic for each other and their time during the week.</li><li>While we encourage the cancellation of standing meetings [1:1s and regular team meetings], DWW is meant to continue the level of work required to get your work done. In some cases, it will not be possible to cancel all meetings, (i.e. sprint teams or essential meetings).</li><li>We learn and iterate on the guiding principles and what works.</li><li>We recommend that you silence all notifications during your deep work blocks, slack, email, phones- lean into deep work even if it’s uncomfortable or foreign at first.</li><li>Challenge yourself to get outside of your day to day work life- use the space to think through big problems that require quiet and concentration, use the time for training or research you might not otherwise get to, etc. </li></ul>`,
//   updated: "2024-07-31T14:01:56.030Z",
//   eventType: "default",
//   htmlLink:
//     "https://www.google.com/calendar/event?eid=MmF0dG1scXBlbGhjcTdtcm4wNGFocHVtOWkgeXVhbmZlbmdAYmxvY2sueHl6",
//   guestsCanSeeOtherGuests: false,
//   etag: '"3444869032060000"',
//   status: "confirmed",
//   organizer: {
//     email: "example.com_hktfkmsgusb7q61dp502ci6sfc@group.calendar.google.com",
//     displayName: "Foo Org",
//   },
//   reminders: { useDefault: false },
//   end: { date: "2024-08-03" },
//   start: { date: "2024-07-29" },
//   sequence: 0,
//   attendees: [
//     {
//       email: "them@example.com",
//       self: true,
//       responseStatus: "needsAction",
//     },
//   ],
//   created: "2023-12-08T17:14:56.000Z",
//   summary: "Deep Work Week",
//   kind: "calendar#event",
//   transparency: "transparent",
//   guestsCanInviteOthers: false,
//   creator: { email: "foo@example.com" },
//   id: "2attmlqpelhcq7mrn04ahpum9i",
//   iCalUID: "2attmlqpelhcq7mrn04ahpum9i@google.com",
// };

export const theirRandomEvent1: GoogleAppsScript.Calendar.Schema.Event = {
  guestsCanSeeOtherGuests: false,
  organizer: {
    displayName: "Engineering Events",
    email: "example.com_ehatnj5ocg32l8puhgosporeg4@group.calendar.google.com",
  },
  originalStartTime: {
    timeZone: "America/Los_Angeles",
    dateTime: "2024-08-01T14:30:00-04:00",
  },
  reminders: { useDefault: true },
  created: "2023-06-27T14:09:03.000Z",
  iCalUID: "30ha2htt252lvd4drs35tup7dj_R20240718T183000@google.com",
  etag: '"3443696410370000"',
  id: "30ha2htt252lvd4drs35tup7dj_20240801T183000Z",
  description: `See <a href="http://go/lightning"><u><b>go/lightning</b></u></a>`,
  kind: "calendar#event",
  eventType: "default",
  recurringEventId: "30ha2htt252lvd4drs35tup7dj_R20240718T183000",
  status: "confirmed",
  attendees: [
    {
      self: true,
      responseStatus: "accepted",
      email: "them@example.com",
    },
  ],
  extendedProperties: {
    shared: {
      originalMeetId: "https://meet.google.com/cfc-utxj-nrt",
      recordingMeetAdded: "true",
      conferenceData: "",
      recordingMeetId: "https://meet.google.com/cfc-utxj-nrt",
      recordingCalEventID: "2ujet65jl54nmpdmcd3lpg47l4",
    },
  },
  htmlLink:
    "https://www.google.com/calendar/event?eid=MzBoYTJodHQyNTJsdmQ0ZHJzMzV0dXA3ZGpfMjAyNDA4MDFUMTgzMDAwWiB5dWFuZmVuZ0BibG9jay54eXo",
  end: {
    dateTime: "2024-08-01T15:00:00-04:00",
    timeZone: "America/Los_Angeles",
  },
  hangoutLink: "https://meet.google.com/cfc-utxj-nrt",
  creator: {
    displayName: "Baz",
    email: "Baz@example.com",
  },
  conferenceData: {
    conferenceSolution: {
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
      key: { type: "hangoutsMeet" },
      name: "Google Meet",
    },
    entryPoints: [
      {
        label: "meet.google.com/cfc-utxj-nrt",
        entryPointType: "video",
        uri: "https://meet.google.com/cfc-utxj-nrt",
      },
      {
        uri: "https://tel.meet/cfc-utxj-nrt?pin=6673751840734",
        pin: "6673751840734",
        entryPointType: "more",
      },
      {
        uri: "tel:+1-205-844-5205",
        entryPointType: "phone",
        regionCode: "US",
        label: "+1 205-844-5205",
        pin: "293917350",
      },
    ],
    conferenceId: "cfc-utxj-nrt",
  },
  guestsCanInviteOthers: false,
  summary: "Lightning Talk : See go/lightning",
  start: {
    dateTime: "2024-08-01T14:30:00-04:00",
    timeZone: "America/Los_Angeles",
  },
  updated: "2024-07-24T19:10:05.185Z",
  sequence: 1,
};

export const theirRandomEvent2: GoogleAppsScript.Calendar.Schema.Event = {
  creator: { email: "otherperson@example.com" },
  htmlLink:
    "https://www.google.com/calendar/event?eid=MnFpbzdzbHIxM2EwbnRrNzhzcm44djRhM3UgeXVhbmZlbmdAYmxvY2sueHl6",
  description: "1:1",
  guestsCanModify: true,
  etag: '"3444878627914000"',
  hangoutLink: "https://meet.google.com/fkh-ezjm-gyi",
  id: "2qio7slr13a0ntk78srn8v4a3u",
  reminders: { useDefault: true },
  status: "confirmed",
  summary: "1:1",
  kind: "calendar#event",
  conferenceData: {
    entryPoints: [
      {
        uri: "https://meet.google.com/fkh-ezjm-gyi",
        label: "meet.google.com/fkh-ezjm-gyi",
        entryPointType: "video",
      },
      {
        entryPointType: "more",
        pin: "4665243123146",
        uri: "https://tel.meet/fkh-ezjm-gyi?pin=4665243123146",
      },
      {
        label: "+1 601-522-7123",
        pin: "147983020",
        entryPointType: "phone",
        regionCode: "US",
        uri: "tel:+1-601-522-7123",
      },
    ],
    conferenceSolution: {
      name: "Google Meet",
      key: { type: "hangoutsMeet" },
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
    },
    conferenceId: "fkh-ezjm-gyi",
  },
  end: {
    timeZone: "America/New_York",
    dateTime: "2024-08-01T15:30:00-04:00",
  },
  eventType: "default",
  created: "2024-07-31T14:49:54.000Z",
  start: {
    timeZone: "America/New_York",
    dateTime: "2024-08-01T15:00:00-04:00",
  },
  updated: "2024-07-31T15:21:53.957Z",
  sequence: 0,
  iCalUID: "2qio7slr13a0ntk78srn8v4a3u@google.com",
  attendees: [
    {
      email: "otherperson@example.com",
      responseStatus: "accepted",
      organizer: true,
    },
    {
      email: "them@example.com",
      responseStatus: "accepted",
      self: true,
    },
  ],
  organizer: { email: "otherperson@example.com" },
};

export const theirTimeConflictEvent: GoogleAppsScript.Calendar.Schema.Event = {
  hangoutLink: "https://meet.google.com/eku-wovi-gir",
  created: "2023-04-04T19:20:03.000Z",
  start: {
    timeZone: "America/New_York",
    dateTime: "2024-08-02T14:30:00-04:00",
  },
  guestsCanModify: true,
  organizer: {
    email: "personC@example.com",
    displayName: "person C",
  },
  recurringEventId: "16a1rbviq3lg7e4mduu7gvtpt7_R20240719T183000",
  id: "16a1rbviq3lg7e4mduu7gvtpt7_20240719T183000Z",
  attendees: [
    {
      organizer: true,
      displayName: "person C",
      email: "personC@example.com",
      responseStatus: "accepted",
    },
    {
      email: "group@example.com",
      responseStatus: "needsAction",
      displayName: "group",
    },
    {
      self: true,
      email: "them@example.com",
      responseStatus: "accepted",
    },
  ],
  htmlLink:
    "https://www.google.com/calendar/event?eid=MTZhMXJidmlxM2xnN2U0bWR1dTdndnRwdDdfMjAyNDA3MTlUMTgzMDAwWiB5dWFuZmVuZ0BibG9jay54eXo",
  etag: '"3444888701844000"',
  reminders: { useDefault: true },
  originalStartTime: {
    dateTime: "2024-07-19T14:30:00-04:00",
    timeZone: "America/New_York",
  },
  description: `Notion Link: <a href="https://www.notion.so/square-seller/be500286c04143de971196173554f41b?v=0235c6f5ec8b4fe197c49d50a12fb32e&amp;pvs=4">https://www.notion.so/square-seller/be500286c04143de971196173554f41b?v=0235c6f5ec8b4fe197c49d50a12fb32e</a><br><br>Per our discussion, Lunch and Learns to go over the various areas of our team (i.e. CI, MTE, BBP, MCT).<br><br>Recordable Google Meet:<br><br>To join the video meeting, click this link: <a href="https://meet.google.com/eku-wovi-gir" target="_blank">https://meet.google.com/eku-wovi-gir</a><br>Otherwise, to join by phone, dial +1 505-636-0249 and enter this PIN: 699 150 293#<br>To view more phone numbers, click this link: <a href="https://tel.meet/eku-wovi-gir?hs=5" target="_blank">https://tel.meet/eku-wovi-gir?hs=5</a>`,
  eventType: "default",
  conferenceData: {
    conferenceSolution: {
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
      key: { type: "hangoutsMeet" },
      name: "Google Meet",
    },
    entryPoints: [
      {
        entryPointType: "video",
        label: "meet.google.com/eku-wovi-gir",
        uri: "https://meet.google.com/eku-wovi-gir",
      },
      {
        entryPointType: "more",
        uri: "https://tel.meet/eku-wovi-gir?pin=1141390192745",
        pin: "1141390192745",
      },
      {
        pin: "699150293",
        entryPointType: "phone",
        label: "+1 505-636-0249",
        uri: "tel:+1-505-636-0249",
        regionCode: "US",
      },
    ],
    conferenceId: "eku-wovi-gir",
  },
  updated: "2024-07-31T16:45:50.922Z",
  kind: "calendar#event",
  status: "confirmed",
  end: {
    dateTime: "2024-08-02T15:20:00-04:00",
    timeZone: "America/New_York",
  },
  summary: "Lunch & Learn",
  sequence: 3,
  iCalUID: "16a1rbviq3lg7e4mduu7gvtpt7_R20240719T183000@google.com",
  creator: {
    displayName: "person C",
    email: "personC@example.com",
  },
};

export const theirVersionOfOurOneOnOneEvent: GoogleAppsScript.Calendar.Schema.Event =
  {
    etag: '"3443847258862000"',
    start: {
      dateTime: "2024-08-02T14:35:00-04:00",
      timeZone: "America/Los_Angeles",
    },
    iCalUID: "gdiuq1f339lh988lg4kqoe71ag@google.com",
    status: "confirmed",
    kind: "calendar#event",
    hangoutLink: "https://meet.google.com/mxb-vhhc-gzr",
    recurringEventId: "gdiuq1f339lh988lg4kqoe71ag",
    created: "2022-11-18T00:59:54.000Z",
    id: "gdiuq1f339lh988lg4kqoe71ag_20240802T183000Z",
    end: {
      dateTime: "2024-08-02T15:00:00-04:00",
      timeZone: "America/Los_Angeles",
    },
    guestsCanModify: true,
    reminders: { useDefault: true },
    originalStartTime: {
      dateTime: "2024-08-02T14:30:00-04:00",
      timeZone: "America/Los_Angeles",
    },
    organizer: {
      displayName: "Me",
      email: "me@example.com",
    },
    updated: "2024-07-25T16:07:09.431Z",
    sequence: 2,
    htmlLink:
      "https://www.google.com/calendar/event?eid=Z2RpdXExZjMzOWxoOTg4bGc0a3FvZTcxYWdfMjAyNDA4MDJUMTgzMDAwWiB5dWFuZmVuZ0BibG9jay54eXo",
    eventType: "default",
    summary: "title",
    conferenceData: {
      conferenceId: "mxb-vhhc-gzr",
      entryPoints: [
        {
          entryPointType: "video",
          label: "meet.google.com/mxb-vhhc-gzr",
          uri: "https://meet.google.com/mxb-vhhc-gzr",
        },
        {
          uri: "https://tel.meet/mxb-vhhc-gzr?pin=8241637050632",
          pin: "8241637050632",
          entryPointType: "more",
        },
        {
          label: "+1 219-379-3408",
          regionCode: "US",
          entryPointType: "phone",
          uri: "tel:+1-219-379-3408",
          pin: "577498364",
        },
      ],
      conferenceSolution: {
        name: "Google Meet",
        iconUri:
          "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
        key: { type: "hangoutsMeet" },
      },
    },
    description: "1:1",
    attendees: [
      {
        email: "me@example.com",
        responseStatus: "accepted",
        displayName: "Me",
        organizer: true,
      },
      {
        responseStatus: "accepted",
        email: "them@example.com",
        self: true,
      },
    ],
    attachments: [
      {
        fileId: "1osjL_WLKQ1iSMYinJp8OLBN_qv0SKJSIuDeut362dmE",
        iconLink:
          "https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.document",
        fileUrl:
          "https://docs.google.com/document/d/1osjL_WLKQ1iSMYinJp8OLBN_qv0SKJSIuDeut362dmE/edit",
        title: "Notes",
        mimeType: "application/vnd.google-apps.document",
      },
    ],
    creator: {
      email: "me@example.com",
      displayName: "Me",
    },
  };

export const interviewEvent: GoogleAppsScript.Calendar.Schema.Event = {
  location: "https://meet.google.com/zuq-rknu-qqz",
  summary: "Interview (Join $Company!) - $interviewee and $Company",
  reminders: { useDefault: true },
  description: `Scheduled interview between $Company and $interviewee, candidate for $role (HID-1234)
    
    August 9, 2024 at 10:00 AM - 11:00 AM (Pacific Time US & Canada) Zachary Sparks
    August 9, 2024 at 11:00 AM - 12:00 PM (Pacific Time US & Canada) Brandon Allenstein
    August 9, 2024 at 1:00 PM - 2:00 PM (Pacific Time US & Canada)`,
  conferenceData: {
    conferenceSolution: {
      key: { type: "hangoutsMeet" },
      name: "Google Meet",
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
    },
    entryPoints: [
      {
        entryPointType: "video",
        label: "meet.google.com/zuq-rknu-qqz",
        uri: "https://meet.google.com/zuq-rknu-qqz",
      },
    ],
  },
  id: "23tpogmf1r7657hah3vai49s68",
  attendees: [
    {
      responseStatus: "needsAction",
      email: "me@example.com",
      self: true,
    },
    {
      email: "them@example.com",
      responseStatus: "needsAction",
    },
  ],
  colorId: "10",
  updated: "2024-08-01T19:24:24.544Z",
  status: "confirmed",
  creator: { email: "creator@example.com" },
  end: {
    dateTime: "2024-08-09T16:00:00-07:00",
    timeZone: "America/Los_Angeles",
  },
  organizer: {
    email: "c_he08jnj39qc8v4lum19ep53t40@group.calendar.google.com",
    displayName: "Creator's Interview Calendar",
  },
  eventType: "default",
  start: {
    dateTime: "2024-08-09T15:30:00-07:00",
    timeZone: "America/Los_Angeles",
  },
  kind: "calendar#event",
  sequence: 0,
  hangoutLink: "https://meet.google.com/zuq-rknu-qqz",
  htmlLink:
    "https://www.google.com/calendar/event?eid=MjN0cG9nbWYxcjc2NTdoYWgzdmFpNDlzNjggdG1lbGxvckBibG9jay54eXo",
  etag: '"3445080529088000"',
  iCalUID: "23tpogmf1r7657hah3vai49s68@google.com",
  created: "2024-08-01T19:21:06.000Z",
};
