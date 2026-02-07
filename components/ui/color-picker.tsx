"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Pipette } from "lucide-react";

// Mooie kleurenpaletten — georganiseerd per rij (tint)
const COLOR_PALETTE = [
  // Rood / Roze
  ["#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b"],
  // Oranje / Warm
  ["#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412"],
  // Geel / Amber
  ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e"],
  // Groen
  ["#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534"],
  // Turquoise / Teal
  ["#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59"],
  // Blauw
  ["#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af"],
  // Indigo / Violet
  ["#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"],
  // Paars / Roze
  ["#e879f9", "#d946ef", "#c026d3", "#a21caf", "#86198f"],
  // Neutraal
  ["#a3a3a3", "#737373", "#525252", "#404040", "#262626"],
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

export function ColorPicker({ value, onChange, onClose }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [showCustom, setShowCustom] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSelect = (color: string) => {
    onChange(color);
    onClose();
  };

  const handleCustomSubmit = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
      onChange(customColor);
      onClose();
    }
  };

  return (
    <div
      ref={pickerRef}
      className="w-[220px] rounded-xl border border-border bg-popover p-3 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Kleurenpalet */}
      <div className="space-y-1">
        {COLOR_PALETTE.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((color) => (
              <button
                key={color}
                onClick={() => handleSelect(color)}
                className="group relative h-7 w-7 rounded-lg transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: color }}
                title={color}
              >
                {value.toLowerCase() === color.toLowerCase() && (
                  <Check
                    className="absolute inset-0 m-auto h-3.5 w-3.5 drop-shadow-sm"
                    style={{ color: isLightColor(color) ? "#000" : "#fff" }}
                    strokeWidth={3}
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-2.5 h-px bg-border" />

      {/* Custom kleur */}
      {showCustom ? (
        <div className="flex items-center gap-1.5">
          <div
            className="h-7 w-7 shrink-0 rounded-lg border border-border"
            style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : value }}
          />
          <input
            ref={inputRef}
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setShowCustom(false);
            }}
            placeholder="#000000"
            maxLength={7}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!/^#[0-9a-fA-F]{6}$/.test(customColor)}
            className="rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-30"
          >
            OK
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setShowCustom(true); setCustomColor(value); }}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pipette className="h-3.5 w-3.5" />
          <span>Eigen kleur...</span>
        </button>
      )}
    </div>
  );
}

/** Check of een kleur licht is (voor contrast icoon) */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
