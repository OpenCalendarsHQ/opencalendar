"use client";

import { useState, useEffect } from "react";
import { Repeat } from "lucide-react";
import { parseRRule, buildRRule, type ParsedRRule, type Frequency } from "@/lib/utils/rrule";

interface RecurrenceEditorProps {
  rrule: string | null | undefined;
  startDate: Date;
  onChange: (rrule: string | null) => void;
}

const FREQUENCY_OPTIONS: { value: Frequency | "NONE"; label: string }[] = [
  { value: "NONE", label: "Nooit herhalen" },
  { value: "DAILY", label: "Dagelijks" },
  { value: "WEEKLY", label: "Wekelijks" },
  { value: "MONTHLY", label: "Maandelijks" },
  { value: "YEARLY", label: "Jaarlijks" },
];

const WEEKDAYS = [
  { value: "MO", label: "Ma" },
  { value: "TU", label: "Di" },
  { value: "WE", label: "Wo" },
  { value: "TH", label: "Do" },
  { value: "FR", label: "Vr" },
  { value: "SA", label: "Za" },
  { value: "SU", label: "Zo" },
];

const END_OPTIONS = [
  { value: "never", label: "Nooit" },
  { value: "after", label: "Na aantal keren" },
  { value: "on", label: "Op datum" },
];

export function RecurrenceEditor({ rrule, startDate, onChange }: RecurrenceEditorProps) {
  const [frequency, setFrequency] = useState<Frequency | "NONE">("NONE");
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [endType, setEndType] = useState<"never" | "after" | "on">("never");
  const [count, setCount] = useState(10);
  const [untilDate, setUntilDate] = useState("");

  // Parse existing RRULE when component mounts or rrule changes
  useEffect(() => {
    if (rrule) {
      try {
        const parsed = parseRRule(rrule);
        setFrequency(parsed.freq);
        setInterval(parsed.interval);
        setSelectedDays(parsed.byDay || []);

        if (parsed.count) {
          setEndType("after");
          setCount(parsed.count);
        } else if (parsed.until) {
          setEndType("on");
          // Format date for input[type=date]
          const year = parsed.until.getFullYear();
          const month = String(parsed.until.getMonth() + 1).padStart(2, "0");
          const day = String(parsed.until.getDate()).padStart(2, "0");
          setUntilDate(`${year}-${month}-${day}`);
        } else {
          setEndType("never");
        }
      } catch (error) {
        console.error("Failed to parse RRULE:", error);
      }
    } else {
      setFrequency("NONE");
    }
  }, [rrule]);

  // Build and emit RRULE whenever settings change
  useEffect(() => {
    if (frequency === "NONE") {
      onChange(null);
      return;
    }

    const rule: ParsedRRule = {
      freq: frequency as Frequency,
      interval,
    };

    // Add weekday selection for weekly recurrence
    if (frequency === "WEEKLY" && selectedDays.length > 0) {
      rule.byDay = selectedDays;
    }

    // Add end conditions
    if (endType === "after" && count > 0) {
      rule.count = count;
    } else if (endType === "on" && untilDate) {
      rule.until = new Date(untilDate);
    }

    const rruleString = buildRRule(rule);
    onChange(rruleString);
  }, [frequency, interval, selectedDays, endType, count, untilDate, onChange]);

  const handleFrequencyChange = (newFreq: string) => {
    setFrequency(newFreq as Frequency | "NONE");

    // Auto-select current weekday for weekly recurrence
    if (newFreq === "WEEKLY" && selectedDays.length === 0) {
      const dayIndex = startDate.getDay();
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      setSelectedDays([dayMap[dayIndex]]);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <div className="space-y-3">
      {/* Frequency selector */}
      <div className="flex items-center gap-2.5">
        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <select
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      {frequency === "NONE" && (
        <p className="text-xs text-muted-foreground ml-6">
          Selecteer een frequentie om herhaling in te stellen
        </p>
      )}

      {/* Show details only when recurring */}
      {frequency !== "NONE" && (
        <div className="ml-6 space-y-3 rounded-md border border-border bg-muted/30 p-3">
          {/* Interval */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Herhaal elke</label>
            <input
              type="number"
              min="1"
              max="999"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground">
              {frequency === "DAILY" && (interval === 1 ? "dag" : "dagen")}
              {frequency === "WEEKLY" && (interval === 1 ? "week" : "weken")}
              {frequency === "MONTHLY" && (interval === 1 ? "maand" : "maanden")}
              {frequency === "YEARLY" && (interval === 1 ? "jaar" : "jaren")}
            </span>
          </div>

          {/* Weekday selector for weekly recurrence */}
          {frequency === "WEEKLY" && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Herhaal op</label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? "bg-foreground text-background"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Eindigt</label>
            <div className="space-y-2">
              {END_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    value={opt.value}
                    checked={endType === opt.value}
                    onChange={(e) => setEndType(e.target.value as typeof endType)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-foreground">{opt.label}</span>

                  {opt.value === "after" && endType === "after" && (
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={count}
                      onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="ml-2 w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    />
                  )}

                  {opt.value === "on" && endType === "on" && (
                    <input
                      type="date"
                      value={untilDate}
                      onChange={(e) => setUntilDate(e.target.value)}
                      className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
