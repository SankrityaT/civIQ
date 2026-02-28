// Created by Kinjal
"use client";
import { useState, useEffect } from "react";

const DATA = [
  { label: "Mon", value: 12 },
  { label: "Tue", value: 28 },
  { label: "Wed", value: 19 },
  { label: "Thu", value: 47 },
  { label: "Fri", value: 35 },
  { label: "Sat", value: 8 },
  { label: "Sun", value: 14 },
];

const P = { t: 24, r: 12, b: 32, l: 32 };
const W = 380;
const H = 180;
const cW = W - P.l - P.r;
const cH = H - P.t - P.b;
const mx = Math.max(...DATA.map((d) => d.value));
const ceil = Math.ceil(mx / 10) * 10;

function gx(i: number) { return P.l + (i / (DATA.length - 1)) * cW; }
function gy(v: number) { return P.t + cH - (v / ceil) * cH; }

// Smooth bezier curve through points
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

const points = DATA.map((d, i) => ({ x: gx(i), y: gy(d.value) }));
const curve = smoothPath(points);
const area = `${curve} L${points[points.length - 1].x},${gy(0)} L${points[0].x},${gy(0)} Z`;

export default function LineChart() {
  const [on, setOn] = useState(false);
  const [hov, setHov] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid */}
        {[0, 0.5, 1].map((pct) => {
          const v = ceil * pct;
          const yy = gy(v);
          return (
            <g key={pct}>
              <line x1={P.l} y1={yy} x2={W - P.r} y2={yy} stroke="#e2e8f0" strokeWidth="0.5" />
              <text x={P.l - 8} y={yy + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="system-ui, -apple-system, sans-serif">
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {DATA.map((d, i) => (
          <text key={d.label} x={gx(i)} y={H - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui, -apple-system, sans-serif">
            {d.label}
          </text>
        ))}

        {/* Area */}
        <path d={area} fill="url(#areaG)" opacity={on ? 1 : 0} className="transition-opacity duration-1000" />

        {/* Curve */}
        <path
          d={curve}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="500"
          strokeDashoffset={on ? "0" : "500"}
          className="transition-all duration-[1200ms] ease-out"
        />

        {/* Hover vertical line */}
        {hov !== null && (
          <line x1={gx(hov)} y1={P.t} x2={gx(hov)} y2={gy(0)} stroke="#f59e0b" strokeWidth="0.5" opacity="0.3" />
        )}

        {/* Data points + interactions */}
        {DATA.map((d, i) => {
          const isH = hov === i;
          return (
            <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} className="cursor-pointer">
              <circle cx={gx(i)} cy={gy(d.value)} r="16" fill="transparent" />
              <circle
                cx={gx(i)}
                cy={gy(d.value)}
                r={isH ? 5 : 3}
                fill={isH ? "#f59e0b" : "#fff"}
                stroke="#f59e0b"
                strokeWidth={isH ? 0 : 2}
                opacity={on ? 1 : 0}
                className="transition-all duration-300"
                style={{ transitionDelay: `${400 + i * 80}ms` }}
              />
              {isH && (
                <g>
                  <rect x={gx(i) - 22} y={gy(d.value) - 28} width="44" height="20" rx="6" fill="#1e293b" />
                  <text x={gx(i)} y={gy(d.value) - 15} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
                    {d.value}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
