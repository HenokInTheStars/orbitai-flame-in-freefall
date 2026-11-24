"use client"

import { useState } from "react"

export type Pt = { x: number; y: number; series: string; tip: string }
export type Series = { id: string; label: string; color: string; hollow?: boolean }

/** Small SVG scatter with hover/focus tooltips. Real data points only; no smoothing or fitted lines. */
export function Scatter({
  points, series, xLabel, yLabel, xLog = false, xDomain, yDomain, height = 320, ariaLabel, width = 640,
}: {
  points: Pt[]; series: Series[]; xLabel: string; yLabel: string; xLog?: boolean
  xDomain: [number, number]; yDomain: [number, number]; height?: number; ariaLabel: string; width?: number
}) {
  const [hover, setHover] = useState<{ p: Pt; x: number; y: number } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const W = width, H = height, L = 56, R = 16, T = 14, B = 44
  const fx = (v: number) => (xLog ? Math.log10(v) : v)
  const [x0, x1] = [fx(xDomain[0]), fx(xDomain[1])]
  const X = (v: number) => L + ((fx(v) - x0) / (x1 - x0)) * (W - L - R)
  const Y = (v: number) => H - B - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - T - B)
  const xTicks = xLog ? [0.5, 1, 2, 5, 10, 20, 50].filter((t) => t >= xDomain[0] && t <= xDomain[1]) : niceTicks(xDomain)
  const yTicks = niceTicks(yDomain)
  const byId = Object.fromEntries(series.map((s) => [s.id, s]))

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Show or hide series">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={!hidden.has(s.id)}
            onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })}
            className={`inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs ${hidden.has(s.id) ? "text-ink-3 opacity-60" : "text-ink-2"}`}
          >
            <span className="inline-block size-2.5 rounded-full" style={s.hollow ? { border: `2px solid ${s.color}` } : { background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="rgb(148 180 210 / 0.12)" />
            <text x={L - 8} y={Y(t) + 4} textAnchor="end" className="num" fontSize="11" fill="#74859a">{t}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={X(t)} y={H - B + 18} textAnchor="middle" className="num" fontSize="11" fill="#74859a">{t}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#a9b8c8">{xLabel}</text>
        <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#a9b8c8">{yLabel}</text>
        {points.filter((p) => !hidden.has(p.series)).map((p, i) => {
          const s = byId[p.series]
          const cx = X(p.x), cy = Y(p.y)
          return (
            <circle
              key={i} cx={cx} cy={cy} r={5.5} tabIndex={0}
              fill={s.hollow ? "#070c16" : s.color} stroke={s.hollow ? s.color : "#070c16"} strokeWidth={s.hollow ? 2 : 1.5}
              onMouseEnter={() => setHover({ p, x: cx, y: cy })} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ p, x: cx, y: cy })} onBlur={() => setHover(null)}
            >
              <title>{p.tip}</title>
            </circle>
          )
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[260px] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-space-950 px-3 py-2 text-xs leading-relaxed text-ink shadow-xl"
          style={{ left: `${(hover.x / W) * 100}%`, top: `calc(${(hover.y / H) * 100}% + 34px)` }}
        >
          {hover.p.tip}
        </div>
      )}
    </div>
  )
}

function niceTicks([a, b]: [number, number]) {
  const span = b - a
  const step = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20].find((s) => span / s <= 7) ?? 50
  const out: number[] = []
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(3))
  return out
}
