/** Demo anchor — session display dates like "Aug 18" resolve to this year. */
export const DEMO_SESSION_YEAR = 2026;

/** Aug 19 — aligned with `TODAY_SHORT_LABEL` in schedule.ts. */
export const DEMO_ANALYTICS_ANCHOR = new Date(Date.UTC(DEMO_SESSION_YEAR, 7, 19));

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Parse roster session labels ("Aug 18") into UTC midnight for filtering. */
export function parseSessionDisplayDate(dateLabel: string): Date | null {
  const match = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(dateLabel.trim());
  if (!match) return null;
  const month = MONTH_INDEX[match[1]];
  const day = Number.parseInt(match[2], 10);
  if (month === undefined || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(DEMO_SESSION_YEAR, month, day));
}

/** Demo "today" for analytics date-range presets — aligned with Today/Week. */
export function demoAnalyticsAnchorDate(): Date {
  return DEMO_ANALYTICS_ANCHOR;
}

export function formatAnalyticsDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
