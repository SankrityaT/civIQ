// Created by Kinjal
"use client";
import { useState, useEffect } from "react";

const SEGMENTS = [
  { label: "English",    value: 68, color: "#f59e0b" },
  { label: "Spanish",    value: 22, color: "#6366f1" },
  { label: "Mandarin",   value: 5,  color: "#14b8a6" },
  { label: "Vietnamese", value: 3,  color: "#f472b6" },
  { label: "Other",      value: 2,  color: "#cbd5e1" },
];

const TOTAL = SEGMENTS.reduce((s, seg) => s + seg.value, 0);
const R = 46;
const SW = 10;
const CX = 58;
const CY = 58;
const C = 2 * Math.PI * R;

export default function DonutChart() {
  const [on, setOn] = useState(false);
  const [hov, setHov] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 300);
    return () => clearTimeout(t);
  }, []);

  let acc = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width="116" height="116" viewBox="0 0 116 116">
          {/* Background track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />

          {/* Segments */}
          {SEGMENTS.map((seg) => {
            const pct = seg.value / TOTAL;
            const dashLen = C * pct;
            const dashGap = C - dashLen;
            const offset = C * 0.25 - acc * C;
            acc += pct;
            const isH = hov === seg.label;

            return (
              <circle
                key={seg.label}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={isH ? SW + 3 : SW}
                strokeDasharray={on ? `${dashLen} ${dashGap}` : `0 ${C}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity={hov && !isH ? 0.25 : 1}
                onMouseEnter={() => setHov(seg.label)}
                onMouseLeave={() => setHov(null)}
                className="cursor-pointer transition-all duration-700 ease-out"
              />
            );
          })}
        </svg>

        {/* Center */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hov ? (
            <>
              <span className="text-base font-bold text-slate-900">
                {SEGMENTS.find((s) => s.label === hov)?.value}%
              </span>
              <span className="text-[9px] font-medium text-slate-400">{hov}</span>
            </>
          ) : (
            <>
              <span className="text-base font-bold text-slate-900">{TOTAL}%</span>
              <span className="text-[9px] font-medium text-slate-400">Coverage</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex min-w-[100px] flex-col gap-1.5">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.label}
            className={`flex items-center gap-1.5 transition-opacity duration-200 ${
              hov && hov !== seg.label ? "opacity-25" : "opacity-100"
            }`}
            onMouseEnter={() => setHov(seg.label)}
            onMouseLeave={() => setHov(null)}
          >
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="flex-1 truncate text-[10px] text-slate-500">{seg.label}</span>
            <span className="text-[10px] font-semibold tabular-nums text-slate-700">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
