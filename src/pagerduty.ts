// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Pagerduty {
  export const TOKEN_KEY = "PAGERDUTY_SECRET_TOKEN";
  export const TOKEN = PropertiesService.getScriptProperties().getProperty(
    Pagerduty.TOKEN_KEY
  );

  interface User {
    id: string;
    name: string;
    email: string;
    time_zone: string;
    color: string;
    avatar_url: string;
    billed: boolean;
    role: string;
    description?: string;
    invitation_sent: boolean;
    job_title?: string;
    teams: Team[];
    contact_methods: ContactMethod[];
    notification_rules: NotificationRule[];
  }

  interface Team {
    id: string;
    type: string;
    summary: string;
    self: string;
    html_url: string;
  }

  interface ContactMethod {
    id: string;
    type: string;
    summary: string;
    self: string;
    html_url?: string;
  }

  interface NotificationRule {
    id: string;
    type: string;
    summary: string;
    self: string;
    html_url?: string;
  }

  export interface OnCall {
    id: string;
    escalation_policy: {
      id: string;
      summary: string;
    };
    user: User;
    schedule: {
      id: string;
      summary: string;
      html_url: string;
    };
    start: string;
    end: string;
  }

  interface OnCallsResponse {
    oncalls: OnCall[];
  }

  // TODO any concern about pagination?
  export function listOnCalls(
    since?: string,
    until?: string,
    schedule_ids?: string[]
  ): OnCall[] | null {
    if (!Pagerduty.TOKEN) {
      throw new Error("PagerDuty API token is not set.");
    }

    const url = "https://api.pagerduty.com/oncalls";
    const params: { [key: string]: string | string[] | undefined } = {
      include: ["users"],
    };

    if (since) {
      params.since = since;
    }
    if (until) {
      params.until = until;
    }
    if (schedule_ids && schedule_ids.length > 0) {
      params.schedule_ids = schedule_ids;
    }

    const queryString = Object.keys(params)
      .map((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          return value
            .map((v) => `${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`)
            .join("&");
        } else {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`;
        }
      })
      .join("&");

    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      headers: {
        Authorization: `Token token=${Pagerduty.TOKEN}`,
        Accept: "application/vnd.pagerduty+json;version=2",
      },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(
        response.getContentText()
      ) as OnCallsResponse;
      return jsonResponse.oncalls;
    } else {
      Logger.log(
        `Error fetching on-calls: ${responseCode} ${response.getContentText()}`
      );
      return null;
    }
  }
}
