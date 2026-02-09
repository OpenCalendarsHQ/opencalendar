/**
 * RRULE (RFC 5545) utilities for recurring events.
 * Uses the rrule.js library for proper RRULE handling.
 */

import { RRule as RRuleLib, RRuleSet } from 'rrule';

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface ParsedRRule {
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
export function parseRRule(rruleStr: string): ParsedRRule {
  const parts = rruleStr.replace("RRULE:", "").split(";");
  const rule: ParsedRRule = {
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
  rule: ParsedRRule,
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

    // Map our ParsedRRule to rrule.js RRule
    const freqMap: Record<Frequency, number> = {
      DAILY: RRuleLib.DAILY,
      WEEKLY: RRuleLib.WEEKLY,
      MONTHLY: RRuleLib.MONTHLY,
      YEARLY: RRuleLib.YEARLY,
    };

    const dayMap: Record<string, any> = {
      MO: RRuleLib.MO,
      TU: RRuleLib.TU,
      WE: RRuleLib.WE,
      TH: RRuleLib.TH,
      FR: RRuleLib.FR,
      SA: RRuleLib.SA,
      SU: RRuleLib.SU,
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
    const rrule = new RRuleLib(rruleOptions);
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
export function buildRRule(rule: ParsedRRule): string {
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
