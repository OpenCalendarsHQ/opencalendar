/**
 * Robust ICS (iCalendar RFC 5545) parser and generator.
 *
 * Handles:
 *  - Multiple VEVENTs per VCALENDAR
 *  - Line folding / unfolding
 *  - VTIMEZONE blocks
 *  - DATE vs DATE-TIME values (with TZID)
 *  - RRULE, EXDATE (multi-value + multiple lines)
 *  - DURATION (ISO 8601 period)
 *  - VALARM (reminders)
 *  - ATTENDEE / ORGANIZER
 *  - SEQUENCE / LAST-MODIFIED
 *  - TEXT escaping / unescaping
 *  - Proper ICS generation from structured data
 */

// ─── Parsed types ───────────────────────────────────────────────────────────

export interface ParsedAttendee {
  email: string;
  name?: string;
  role?: string; // CHAIR, REQ-PARTICIPANT, OPT-PARTICIPANT, NON-PARTICIPANT
  partStat?: string; // ACCEPTED, DECLINED, TENTATIVE, NEEDS-ACTION, DELEGATED
  rsvp?: boolean;
}

export interface ParsedAlarm {
  action: string; // DISPLAY, AUDIO, EMAIL
  trigger: string; // e.g. -PT15M, -P1D
  description?: string;
}

export interface ParsedEvent {
  uid: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location: string | null;
  url: string | null;
  timezone: string | null;
  rrule: string | null;
  exDates: Date[];
  status: "confirmed" | "tentative" | "cancelled";
  sequence: number;
  lastModified: Date | null;
  created: Date | null;
  organizer: ParsedAttendee | null;
  attendees: ParsedAttendee[];
  alarms: ParsedAlarm[];
  categories: string[];
  transparency: "opaque" | "transparent";
  color: string | null;
  /** Raw properties we didn't specifically parse, for round-tripping */
  extraProps: [string, string][];
}

// ─── Line-level helpers ─────────────────────────────────────────────────────

/** Unfold RFC 5545 folded lines (continuation lines start with SPACE or TAB). */
function unfoldLines(raw: string): string {
  return raw.replace(/\r?\n[\t ]/g, "");
}

/** Split unfolded text into content lines. */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.length > 0);
}

/**
 * Parse one content line into { name, params, value }.
 * e.g. "DTSTART;TZID=Europe/Amsterdam:20250207T093000"
 *   → { name: "DTSTART", params: { TZID: "Europe/Amsterdam" }, value: "20250207T093000" }
 */
interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseContentLine(line: string): ContentLine | null {
  // The value comes after the first unquoted colon
  // Parameters are separated by semicolons before that colon
  let inQuote = false;
  let colonIdx = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ":" && !inQuote) {
      colonIdx = i;
      break;
    }
  }

  if (colonIdx === -1) return null;

  const head = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  // Split head into name + params
  const parts = splitHeadParams(head);
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq > 0) {
      const k = parts[i].substring(0, eq).toUpperCase();
      let v = parts[i].substring(eq + 1);
      // Strip surrounding quotes
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.slice(1, -1);
      }
      params[k] = v;
    }
  }

  return { name, params, value };
}

/**
 * Split the head portion (before the colon) by semicolons,
 * respecting quoted strings.
 */
function splitHeadParams(head: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;
  for (const ch of head) {
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === ";" && !inQuote) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}

// ─── Date parsing ───────────────────────────────────────────────────────────

/**
 * Parse an ICS date/datetime string.
 *
 *   - "20250207"              → local date (all-day)
 *   - "20250207T093000"       → local datetime
 *   - "20250207T093000Z"      → UTC datetime
 *
 * If tzid is provided we store it in metadata but JS Date lacks proper
 * timezone support; in practice the Neon DB stores the timezone separately.
 */
export function parseICSDate(value: string): Date {
  const v = value.trim();

  if (v.length === 8) {
    // Date only
    return new Date(
      parseInt(v.substring(0, 4)),
      parseInt(v.substring(4, 6)) - 1,
      parseInt(v.substring(6, 8))
    );
  }

  const isUTC = v.endsWith("Z");
  const dt = v.replace("Z", "").replace("T", "");

  const year = parseInt(dt.substring(0, 4));
  const month = parseInt(dt.substring(4, 6)) - 1;
  const day = parseInt(dt.substring(6, 8));
  const hour = parseInt(dt.substring(8, 10) || "0");
  const minute = parseInt(dt.substring(10, 12) || "0");
  const second = parseInt(dt.substring(12, 14) || "0");

  return isUTC
    ? new Date(Date.UTC(year, month, day, hour, minute, second))
    : new Date(year, month, day, hour, minute, second);
}

/** Detect all-day from property params (VALUE=DATE). */
function isAllDayProp(params: Record<string, string>): boolean {
  const v = params["VALUE"]?.toUpperCase();
  return v === "DATE";
}

// ─── Duration parsing ───────────────────────────────────────────────────────

/**
 * Parse ISO 8601 duration like P1DT2H30M and add to a Date.
 * Supports: weeks (W), days (D), hours (H), minutes (M), seconds (S).
 */
export function addDuration(date: Date, dur: string): Date {
  const result = new Date(date);
  const negative = dur.startsWith("-");
  const d = dur.replace(/^[+-]?P/, "");

  const weekMatch = d.match(/(\d+)W/);
  const dayMatch = d.match(/(\d+)D/);
  // After "T" come the time parts
  const timeStr = d.includes("T") ? d.split("T")[1] : "";
  const hourMatch = timeStr.match(/(\d+)H/);
  const minMatch = timeStr.match(/(\d+)M/);
  const secMatch = timeStr.match(/(\d+)S/);

  const sign = negative ? -1 : 1;

  if (weekMatch) result.setDate(result.getDate() + sign * parseInt(weekMatch[1]) * 7);
  if (dayMatch) result.setDate(result.getDate() + sign * parseInt(dayMatch[1]));
  if (hourMatch) result.setHours(result.getHours() + sign * parseInt(hourMatch[1]));
  if (minMatch) result.setMinutes(result.getMinutes() + sign * parseInt(minMatch[1]));
  if (secMatch) result.setSeconds(result.getSeconds() + sign * parseInt(secMatch[1]));

  return result;
}

// ─── Text escaping ──────────────────────────────────────────────────────────

export function unescapeICS(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/\\N/gi, "\n") // \N or \n → newline
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// ─── Component extraction ───────────────────────────────────────────────────

/** Extract all blocks between BEGIN:TYPE and END:TYPE. */
function extractBlocks(lines: string[], type: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] | null = null;
  let depth = 0;

  for (const line of lines) {
    if (line === `BEGIN:${type}`) {
      if (depth === 0) current = [];
      depth++;
    } else if (line === `END:${type}`) {
      depth--;
      if (depth === 0 && current) {
        blocks.push(current);
        current = null;
      }
    } else if (current !== null) {
      current.push(line);
    }
  }

  return blocks;
}

// ─── Attendee parsing ───────────────────────────────────────────────────────

function parseAttendee(cl: ContentLine): ParsedAttendee {
  const email = cl.value.replace(/^mailto:/i, "");
  return {
    email,
    name: cl.params["CN"] || undefined,
    role: cl.params["ROLE"] || undefined,
    partStat: cl.params["PARTSTAT"] || undefined,
    rsvp: cl.params["RSVP"]?.toUpperCase() === "TRUE",
  };
}

// ─── VALARM parsing ─────────────────────────────────────────────────────────

function parseAlarm(alarmLines: string[]): ParsedAlarm {
  const alarm: ParsedAlarm = { action: "DISPLAY", trigger: "-PT15M" };
  for (const line of alarmLines) {
    const cl = parseContentLine(line);
    if (!cl) continue;
    switch (cl.name) {
      case "ACTION":
        alarm.action = cl.value.toUpperCase();
        break;
      case "TRIGGER":
        alarm.trigger = cl.value;
        break;
      case "DESCRIPTION":
        alarm.description = unescapeICS(cl.value) || undefined;
        break;
    }
  }
  return alarm;
}

// ─── Main parser ────────────────────────────────────────────────────────────

/**
 * Parse an ICS string and extract ALL VEVENTs.
 * Returns an array of parsed events.
 */
export function parseICS(icsData: string): ParsedEvent[] {
  try {
    const unfolded = unfoldLines(icsData);
    const lines = splitLines(unfolded);
    const eventBlocks = extractBlocks(lines, "VEVENT");

    return eventBlocks
      .map((block) => parseEventBlock(block))
      .filter((e): e is ParsedEvent => e !== null);
  } catch (error) {
    console.error("ICS parse error:", error);
    return [];
  }
}

/**
 * Legacy: parse the first VEVENT from an ICS string.
 * Returns null if no event found.
 */
export function parseFirstEvent(icsData: string): ParsedEvent | null {
  const events = parseICS(icsData);
  return events[0] ?? null;
}

function parseEventBlock(eventLines: string[]): ParsedEvent | null {
  // Collect properties. Some may repeat (EXDATE, ATTENDEE).
  const singleProps = new Map<string, ContentLine>();
  const multiProps = new Map<string, ContentLine[]>();
  const alarmBlocks = extractBlocks(eventLines, "VALARM");
  const extraProps: [string, string][] = [];

  // Filter out VALARM lines from main event parsing
  const mainLines = eventLines.filter((line) => {
    // Skip lines inside VALARM blocks
    return true; // We'll handle nesting via extractBlocks
  });

  // Track lines inside VALARM to skip them
  let insideAlarm = false;
  for (const line of mainLines) {
    if (line === "BEGIN:VALARM") {
      insideAlarm = true;
      continue;
    }
    if (line === "END:VALARM") {
      insideAlarm = false;
      continue;
    }
    if (insideAlarm) continue;

    const cl = parseContentLine(line);
    if (!cl) continue;

    const multiNames = ["EXDATE", "ATTENDEE", "CATEGORIES"];
    if (multiNames.includes(cl.name)) {
      const list = multiProps.get(cl.name) || [];
      list.push(cl);
      multiProps.set(cl.name, list);
    } else {
      singleProps.set(cl.name, cl);
    }
  }

  // ── Required: DTSTART ──
  const dtStartCl = singleProps.get("DTSTART");
  if (!dtStartCl) return null;

  const isAllDay = isAllDayProp(dtStartCl.params);
  const startTime = parseICSDate(dtStartCl.value);
  const timezone = dtStartCl.params["TZID"] || null;

  // ── End time: DTEND or DURATION ──
  let endTime: Date;
  const dtEndCl = singleProps.get("DTEND");
  const durationCl = singleProps.get("DURATION");

  if (dtEndCl) {
    endTime = parseICSDate(dtEndCl.value);
  } else if (durationCl) {
    endTime = addDuration(startTime, durationCl.value);
  } else {
    endTime = new Date(startTime);
    if (isAllDay) {
      endTime.setDate(endTime.getDate() + 1);
    } else {
      endTime.setHours(endTime.getHours() + 1);
    }
  }

  // ── UID ──
  const uid = singleProps.get("UID")?.value || crypto.randomUUID();

  // ── RRULE ──
  const rrule = singleProps.get("RRULE")?.value || null;

  // ── EXDATE(s) — may span multiple lines and contain comma-separated values ──
  const exDates: Date[] = [];
  for (const cl of multiProps.get("EXDATE") || []) {
    for (const v of cl.value.split(",")) {
      const trimmed = v.trim();
      if (trimmed) {
        try {
          exDates.push(parseICSDate(trimmed));
        } catch {
          // skip invalid
        }
      }
    }
  }

  // ── Status ──
  const rawStatus = singleProps.get("STATUS")?.value?.toUpperCase() || "CONFIRMED";
  const status: ParsedEvent["status"] =
    rawStatus === "TENTATIVE" ? "tentative" : rawStatus === "CANCELLED" ? "cancelled" : "confirmed";

  // ── Sequence ──
  const sequence = parseInt(singleProps.get("SEQUENCE")?.value || "0") || 0;

  // ── Timestamps ──
  const lastModified = singleProps.get("LAST-MODIFIED")
    ? parseICSDate(singleProps.get("LAST-MODIFIED")!.value)
    : null;
  const created = singleProps.get("CREATED")
    ? parseICSDate(singleProps.get("CREATED")!.value)
    : null;

  // ── Organizer ──
  const orgCl = singleProps.get("ORGANIZER");
  const organizer = orgCl ? parseAttendee(orgCl) : null;

  // ── Attendees ──
  const attendees = (multiProps.get("ATTENDEE") || []).map(parseAttendee);

  // ── Alarms ──
  const alarms = alarmBlocks.map(parseAlarm);

  // ── Categories ──
  const categories: string[] = [];
  for (const cl of multiProps.get("CATEGORIES") || []) {
    categories.push(...cl.value.split(",").map((c) => c.trim()));
  }

  // ── Transparency ──
  const transp = singleProps.get("TRANSP")?.value?.toUpperCase();
  const transparency: ParsedEvent["transparency"] =
    transp === "TRANSPARENT" ? "transparent" : "opaque";

  // ── Color ──
  const color = singleProps.get("COLOR")?.value || null;

  // ── Collect extra props for round-tripping ──
  const parsedNames = new Set([
    "DTSTART", "DTEND", "DURATION", "UID", "RRULE", "EXDATE",
    "SUMMARY", "DESCRIPTION", "LOCATION", "URL", "STATUS",
    "SEQUENCE", "LAST-MODIFIED", "CREATED", "ORGANIZER",
    "ATTENDEE", "CATEGORIES", "TRANSP", "COLOR", "DTSTAMP",
  ]);

  for (const [name, cl] of singleProps) {
    if (!parsedNames.has(name)) {
      extraProps.push([name, cl.value]);
    }
  }

  return {
    uid,
    title: unescapeICS(singleProps.get("SUMMARY")?.value || null) || "(Geen titel)",
    description: unescapeICS(singleProps.get("DESCRIPTION")?.value || null),
    startTime,
    endTime,
    isAllDay,
    location: unescapeICS(singleProps.get("LOCATION")?.value || null),
    url: singleProps.get("URL")?.value || null,
    timezone,
    rrule,
    exDates,
    status,
    sequence,
    lastModified,
    created,
    organizer,
    attendees,
    alarms,
    categories,
    transparency,
    color,
    extraProps,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ICS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface ICSEventInput {
  uid?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  status?: ParsedEvent["status"];
  timezone?: string | null;
  rrule?: string | null;
  exDates?: (Date | string)[] | null;
  organizer?: { email: string; name?: string } | null;
  attendees?: { email: string; name?: string; rsvp?: boolean }[];
  alarms?: { trigger: string; description?: string }[];
  categories?: string[];
  transparency?: "opaque" | "transparent";
  sequence?: number;
}

/** Format a JS Date to ICS datetime "20250207T093000Z". */
export function formatICSDateTimeUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Format a JS Date to ICS date-only "20250207". */
export function formatICSDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Fold a content line to 75-octet max width (RFC 5545 §3.1).
 * Returns one or more lines joined by CRLF + SPACE.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  parts.push(line.substring(0, 75));
  let pos = 75;
  while (pos < line.length) {
    parts.push(" " + line.substring(pos, pos + 74)); // 1 space + 74 chars = 75 octets
    pos += 74;
  }
  return parts.join("\r\n");
}

/**
 * Generate a valid ICS VCALENDAR string from one or more events.
 */
export function generateICS(events: ICSEventInput[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenCalendar//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    const uid = evt.uid || crypto.randomUUID();
    const now = new Date();

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICSDateTimeUTC(now)}`);

    // Start / end
    if (evt.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICSDate(evt.startTime)}`);
      lines.push(`DTEND;VALUE=DATE:${formatICSDate(evt.endTime)}`);
    } else if (evt.timezone) {
      // With timezone
      const fmt = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
      };
      lines.push(`DTSTART;TZID=${evt.timezone}:${fmt(evt.startTime)}`);
      lines.push(`DTEND;TZID=${evt.timezone}:${fmt(evt.endTime)}`);
    } else {
      lines.push(`DTSTART:${formatICSDateTimeUTC(evt.startTime)}`);
      lines.push(`DTEND:${formatICSDateTimeUTC(evt.endTime)}`);
    }

    lines.push(`SUMMARY:${escapeICS(evt.title)}`);

    if (evt.description) {
      lines.push(`DESCRIPTION:${escapeICS(evt.description)}`);
    }
    if (evt.location) {
      lines.push(`LOCATION:${escapeICS(evt.location)}`);
    }
    if (evt.url) {
      lines.push(`URL:${evt.url}`);
    }

    if (evt.status && evt.status !== "confirmed") {
      lines.push(`STATUS:${evt.status.toUpperCase()}`);
    }

    if (evt.rrule) {
      lines.push(`RRULE:${evt.rrule}`);
    }

    // Exception dates (EXDATE)
    if (evt.exDates && evt.exDates.length > 0) {
      // Group EXDATEs: all-day vs timed
      // For simplicity, we'll format each as UTC datetime or date-only
      const exDateStrs = evt.exDates.map((d) => {
        const date = typeof d === "string" ? new Date(d) : d;
        if (evt.isAllDay) {
          return formatICSDate(date);
        } else {
          return formatICSDateTimeUTC(date);
        }
      });

      // Combine all exception dates in one EXDATE line (comma-separated)
      if (evt.isAllDay) {
        lines.push(`EXDATE;VALUE=DATE:${exDateStrs.join(",")}`);
      } else {
        lines.push(`EXDATE:${exDateStrs.join(",")}`);
      }
    }

    if (evt.transparency === "transparent") {
      lines.push("TRANSP:TRANSPARENT");
    }

    if (typeof evt.sequence === "number" && evt.sequence > 0) {
      lines.push(`SEQUENCE:${evt.sequence}`);
    }

    // Organizer
    if (evt.organizer) {
      const orgParts = [`ORGANIZER`];
      if (evt.organizer.name) orgParts[0] += `;CN=${evt.organizer.name}`;
      orgParts[0] += `:mailto:${evt.organizer.email}`;
      lines.push(orgParts[0]);
    }

    // Attendees
    if (evt.attendees) {
      for (const att of evt.attendees) {
        let line = "ATTENDEE";
        if (att.name) line += `;CN=${att.name}`;
        if (att.rsvp) line += ";RSVP=TRUE";
        line += `:mailto:${att.email}`;
        lines.push(line);
      }
    }

    // Categories
    if (evt.categories && evt.categories.length > 0) {
      lines.push(`CATEGORIES:${evt.categories.map(escapeICS).join(",")}`);
    }

    // Alarms
    if (evt.alarms) {
      for (const alarm of evt.alarms) {
        lines.push("BEGIN:VALARM");
        lines.push("ACTION:DISPLAY");
        lines.push(`TRIGGER:${alarm.trigger}`);
        lines.push(`DESCRIPTION:${escapeICS(alarm.description || evt.title)}`);
        lines.push("END:VALARM");
      }
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join("\r\n");
}

/**
 * Generate a single-event ICS string — convenience wrapper.
 */
export function generateSingleEventICS(event: ICSEventInput): string {
  return generateICS([event]);
}
