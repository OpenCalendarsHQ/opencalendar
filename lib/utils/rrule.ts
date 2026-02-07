/**
 * RRULE (RFC 5545) utilities for recurring events.
 *
 * This module provides helpers to generate event instances
 * from recurrence rules in the iCalendar standard.
 */

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RRule {
  freq: Frequency;
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[]; // MO, TU, WE, TH, FR, SA, SU
  byMonth?: number[];
  byMonthDay?: number[];
  bySetPos?: number[];
  wkst?: string; // Week start day
}

/**
 * Parse an RRULE string into a structured object.
 * Example: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
 */
export function parseRRule(rruleStr: string): RRule {
  const parts = rruleStr.replace("RRULE:", "").split(";");
  const rule: RRule = {
    freq: "WEEKLY",
    interval: 1,
  };

  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        rule.freq = value as Frequency;
        break;
      case "INTERVAL":
        rule.interval = parseInt(value);
        break;
      case "COUNT":
        rule.count = parseInt(value);
        break;
      case "UNTIL":
        rule.until = parseRRuleDate(value);
        break;
      case "BYDAY":
        rule.byDay = value.split(",");
        break;
      case "BYMONTH":
        rule.byMonth = value.split(",").map(Number);
        break;
      case "BYMONTHDAY":
        rule.byMonthDay = value.split(",").map(Number);
        break;
      case "BYSETPOS":
        rule.bySetPos = value.split(",").map(Number);
        break;
      case "WKST":
        rule.wkst = value;
        break;
    }
  }

  return rule;
}

/**
 * Generate occurrences for a recurring event within a date range.
 */
export function generateOccurrences(
  rule: RRule,
  startDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exDates: Date[] = [],
  maxOccurrences: number = 365
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  let count = 0;

  // Convert exDates to timestamp set for fast lookup
  const excludedTimestamps = new Set(exDates.map((d) => d.getTime()));

  while (current <= rangeEnd && count < maxOccurrences) {
    // Check count limit
    if (rule.count !== undefined && count >= rule.count) break;

    // Check until limit
    if (rule.until && current > rule.until) break;

    // Check if this occurrence is within range and not excluded
    if (
      current >= rangeStart &&
      !excludedTimestamps.has(current.getTime())
    ) {
      // Check BYDAY filter
      if (rule.byDay && !matchesByDay(current, rule.byDay)) {
        current = advanceDate(current, rule);
        continue;
      }

      occurrences.push(new Date(current));
    }

    current = advanceDate(current, rule);
    count++;
  }

  return occurrences;
}

/**
 * Build an RRULE string from components.
 */
export function buildRRule(rule: RRule): string {
  const parts: string[] = [`FREQ=${rule.freq}`];

  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  if (rule.until) parts.push(`UNTIL=${formatRRuleDate(rule.until)}`);
  if (rule.byDay?.length) parts.push(`BYDAY=${rule.byDay.join(",")}`);
  if (rule.byMonth?.length) parts.push(`BYMONTH=${rule.byMonth.join(",")}`);
  if (rule.byMonthDay?.length)
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`);

  return parts.join(";");
}

// --- Internal helpers ---

function advanceDate(date: Date, rule: RRule): Date {
  const next = new Date(date);

  switch (rule.freq) {
    case "DAILY":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * rule.interval);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  return next;
}

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function matchesByDay(date: Date, byDay: string[]): boolean {
  const dayOfWeek = date.getDay();
  return byDay.some((day) => {
    const dayNum = DAY_MAP[day.replace(/[+-\d]/g, "")];
    return dayNum === dayOfWeek;
  });
}

function parseRRuleDate(value: string): Date {
  const clean = value.replace("Z", "");
  if (clean.length === 8) {
    return new Date(
      parseInt(clean.substring(0, 4)),
      parseInt(clean.substring(4, 6)) - 1,
      parseInt(clean.substring(6, 8))
    );
  }
  return new Date(
    parseInt(clean.substring(0, 4)),
    parseInt(clean.substring(4, 6)) - 1,
    parseInt(clean.substring(6, 8)),
    parseInt(clean.substring(9, 11) || "0"),
    parseInt(clean.substring(11, 13) || "0"),
    parseInt(clean.substring(13, 15) || "0")
  );
}

function formatRRuleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
