/**
 * RRULE (RFC 5545) utilities for recurring events.
 * Uses the rrule.js library for proper RRULE handling.
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';

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
 * Uses rrule.js library for accurate occurrence generation.
 */
export function generateOccurrences(
  rule: RRule,
  startDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exDates: Date[] = [],
  maxOccurrences: number = 365
): Date[] {
  try {
    // Early exit if event ends before range starts
    if (rule.until && rule.until < rangeStart) {
      return [];
    }

    // Map our RRule to rrule.js RRule
    const freqMap: Record<Frequency, number> = {
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
    };

    const dayMap: Record<string, any> = {
      MO: RRule.MO,
      TU: RRule.TU,
      WE: RRule.WE,
      TH: RRule.TH,
      FR: RRule.FR,
      SA: RRule.SA,
      SU: RRule.SU,
    };

    const rruleOptions: any = {
      freq: freqMap[rule.freq],
      interval: rule.interval,
      dtstart: startDate,
    };

    if (rule.count) {
      rruleOptions.count = rule.count;
    }

    if (rule.until) {
      rruleOptions.until = rule.until;
    }

    if (rule.byDay && rule.byDay.length > 0) {
      rruleOptions.byweekday = rule.byDay.map(day => {
        const cleanDay = day.replace(/[+-\d]/g, "");
        return dayMap[cleanDay];
      });
    }

    if (rule.byMonth && rule.byMonth.length > 0) {
      rruleOptions.bymonth = rule.byMonth;
    }

    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      rruleOptions.bymonthday = rule.byMonthDay;
    }

    if (rule.bySetPos && rule.bySetPos.length > 0) {
      rruleOptions.bysetpos = rule.bySetPos;
    }

    // Create RRuleSet to handle exclusion dates
    const rruleSet = new RRuleSet();
    const rrule = new RRule(rruleOptions);
    rruleSet.rrule(rrule);

    // Add exclusion dates
    exDates.forEach(exDate => {
      rruleSet.exdate(exDate);
    });

    // Generate occurrences within the range
    const occurrences = rruleSet.between(rangeStart, rangeEnd, true);

    // Limit to maxOccurrences
    return occurrences.slice(0, maxOccurrences);
  } catch (error) {
    console.error('Error generating occurrences:', error);
    return [];
  }
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
