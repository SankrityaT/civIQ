// Created by Kinjal
"use client";
import { useState, useEffect } from "react";

const CITIES = [
  { name: "Phoenix",     x: 178, y: 210, workers: 847, pct: "Maricopa",  showLabel: true },
  { name: "Tucson",      x: 190, y: 322, workers: 412, pct: "Pima",      showLabel: true },
  { name: "Mesa",        x: 212, y: 222, workers: 326, pct: "Maricopa",  showLabel: false },
  { name: "Scottsdale",  x: 198, y: 190, workers: 289, pct: "Maricopa",  showLabel: false },
  { name: "Chandler",    x: 208, y: 244, workers: 215, pct: "Maricopa",  showLabel: false },
  { name: "Flagstaff",   x: 158, y: 92,  workers: 134, pct: "Coconino",  showLabel: true },
  { name: "Yuma",        x: 56,  y: 332, workers: 98,  pct: "Yuma",      showLabel: true },
  { name: "Prescott",    x: 132, y: 150, workers: 87,  pct: "Yavapai",   showLabel: false },
  { name: "Tempe",       x: 192, y: 234, workers: 264, pct: "Maricopa",  showLabel: false },
  { name: "Lake Havasu", x: 68,  y: 172, workers: 72,  pct: "Mohave",    showLabel: false },
];

// Real Arizona state boundary (simplified but accurate)
const AZ_PATH =
  "M38,2 L270,2 L270,18 L280,32 L280,62 L268,62 L260,78 L250,82 L244,96 " +
  "L238,100 L236,118 L228,132 L224,148 L220,156 L222,172 L218,188 L222,200 " +
  "L230,208 L236,224 L242,236 L244,252 L240,268 L236,280 L238,296 L242,312 " +
  "L244,332 L248,348 L248,362 L244,378 L62,378 L58,370 L52,362 L50,348 " +
  "L44,338 L40,322 L38,308 L36,292 L34,278 L32,262 L30,248 L32,232 " +
  "L34,218 L32,202 L34,188 L32,172 L34,158 L32,142 L34,128 L36,112 " +
  "L34,98 L36,82 L34,68 L36,52 L34,38 L36,22 L38,2 Z";

const maxW = Math.max(...CITIES.map((c) => c.workers));

export default function ArizonaMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 310 390"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="azFill" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="azShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.15" />
          </filter>
          <radialGradient id="dotGlow">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* State shape */}
        <path
          d={AZ_PATH}
          fill="url(#azFill)"
          filter="url(#azShadow)"
          stroke="#334155"
          strokeWidth="0.75"
          opacity={mounted ? 1 : 0}
          className="transition-opacity duration-700"
        />

        {/* Grid texture */}
        {[100, 180, 260, 340].map((yy) => (
          <line key={`h${yy}`} x1="30" y1={yy} x2="280" y2={yy} stroke="#334155" strokeWidth="0.3" opacity="0.2" />
        ))}
        {[100, 180, 240].map((xx) => (
          <line key={`v${xx}`} x1={xx} y1="2" x2={xx} y2="378" stroke="#334155" strokeWidth="0.3" opacity="0.2" />
        ))}

        {/* City markers */}
        {CITIES.map((city, idx) => {
          const r = 3 + (city.workers / maxW) * 8;
          const isHov = hovered === city.name;

          return (
            <g
              key={city.name}
              onMouseEnter={() => setHovered(city.name)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
              opacity={mounted ? 1 : 0}
              style={{ transition: `opacity 0.5s ease ${200 + idx * 60}ms` }}
            >
              {/* Soft glow */}
              <circle cx={city.x} cy={city.y} r={r * 3} fill="url(#dotGlow)" opacity={isHov ? 0.8 : 0.4} className="transition-opacity duration-300" />

              {/* Pulse ring */}
              {isHov && (
                <circle cx={city.x} cy={city.y} r={r + 4} fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4">
                  <animate attributeName="r" values={`${r + 2};${r + 10};${r + 2}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Core circle */}
              <circle
                cx={city.x}
                cy={city.y}
                r={isHov ? r + 1.5 : r}
                fill="#f59e0b"
                opacity={0.5 + (city.workers / maxW) * 0.5}
                className="transition-all duration-200"
              />
              <circle
                cx={city.x}
                cy={city.y}
                r={r * 0.35}
                fill="#fef3c7"
                opacity={isHov ? 1 : 0.7}
                className="transition-opacity duration-200"
              />

              {/* Label */}
              {(isHov || city.showLabel) && (
                <text
                  x={city.x + r + 5}
                  y={city.y + 3}
                  fill={isHov ? "#fbbf24" : "#94a3b8"}
                  fontSize="9"
                  fontWeight={isHov ? "600" : "400"}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  className="pointer-events-none select-none"
                >
                  {city.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip card */}
      {hovered && (() => {
        const city = CITIES.find((c) => c.name === hovered);
        if (!city) return null;
        return (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-slate-700/50 bg-slate-900/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-sm"
            style={{
              left: `${(city.x / 310) * 100}%`,
              top: `${(city.y / 390) * 100 - 2}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-[11px] font-semibold text-white">{city.name}</p>
            <p className="text-[9px] text-slate-400">{city.pct} County</p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-sm font-bold text-amber-400">{city.workers}</span>
              <span className="text-[9px] text-slate-500">workers</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
