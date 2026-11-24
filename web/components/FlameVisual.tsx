/**
 * Illustration only: an Earth-gravity flame (buoyant teardrop, yellow from soot) next to a
 * microgravity flame (round, dimmer and bluer). Shapes follow the physics described in the sources;
 * nothing here is a measurement or a prediction.
 *  - Oxygen: more O2 -> bigger, brighter, faster-flickering flame (both panels).
 *  - Air flow (optional, microgravity panel): Link et al. 2018 (p. 4, Fig. 4) report that at LOW flow the
 *    microgravity flame turns blue and round; so as flow rises we stretch it downstream and let yellow back in.
 */
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

export function FlameVisual({ o2, flow, compact = false }: { o2: number; flow?: number; compact?: boolean }) {
  const t = clamp01((o2 - 15) / 25) // 15% -> 0, 40% -> 1
  // Sizes are capped so the flames always stay inside their boxes.
  const sEarth = 0.45 + t * 0.67 // 0.45x .. 1.12x (the teardrop is drawn 122 units tall from its base at y=140)
  const sSpace = 0.5 + t * 0.5 // 0.5x .. 1.0x
  const glow = 0.35 + t * 0.65 // brightness
  const flickerS = (1.3 - t * 0.7).toFixed(2) // faster flicker with more oxygen
  const f = flow == null ? 0 : clamp01((flow - 0.5) / 24.5) // 0.5 cm/s -> 0, 25 cm/s -> 1
  const rx = 44 * (1 + 0.3 * f)
  const ry = 44 * (1 - 0.28 * f)
  const cx = 60 + 6 * f // flame is pushed downstream
  const h = compact ? 150 : 200
  return (
    <div className="grid grid-cols-2 content-start gap-3 self-start">
      <figure className="overflow-hidden rounded-xl border border-line bg-space-900/60 p-3 text-center">
        <svg viewBox="0 0 120 160" style={{ height: h }} className="mx-auto" role="img" aria-label={`Illustration of a flame in Earth gravity at ${o2.toFixed(0)}% oxygen: tall yellow teardrop`}>
          <defs>
            <radialGradient id="fe" cx="50%" cy="75%" r="70%">
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
            <filter id="fe-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={2 + t * 5} /></filter>
          </defs>
          <g style={{ transition: "transform .35s ease, opacity .35s ease", opacity: glow, transform: `scale(${sEarth})`, transformOrigin: "60px 140px", transformBox: "view-box" }}>
            <path d="M60 18 C 78 55, 92 80, 88 108 C 85 128, 72 140, 60 140 C 48 140, 35 128, 32 108 C 28 80, 42 55, 60 18 Z" fill="#f97316" opacity={0.5 * t} filter="url(#fe-glow)" />
            <g className="flame-earth" style={{ animationDuration: `${flickerS}s` }}>
              <path d="M60 18 C 78 55, 92 80, 88 108 C 85 128, 72 140, 60 140 C 48 140, 35 128, 32 108 C 28 80, 42 55, 60 18 Z" fill="url(#fe)" />
              <path d="M60 70 C 68 90, 72 102, 70 116 C 68 128, 64 132, 60 132 C 56 132, 52 128, 50 116 C 48 102, 52 90, 60 70 Z" fill="#60a5fa" fillOpacity="0.55" />
            </g>
          </g>
          <rect x="44" y="140" width="32" height="10" rx="2" fill="#475569" />
        </svg>
        <figcaption className="mt-1 text-xs text-ink-2"><span className="font-semibold text-earth">Earth (1 g)</span><br />Hot gas rises, pulls in fresh air</figcaption>
      </figure>
      <figure className="overflow-hidden rounded-xl border border-line bg-space-900/60 p-3 text-center">
        <svg viewBox="0 0 120 160" style={{ height: h }} className="mx-auto" role="img" aria-label={`Illustration of a flame in microgravity at ${o2.toFixed(0)}% oxygen${flow != null ? ` and ${flow} cm/s air flow` : ""}: rounder and bluer`}>
          <defs>
            <radialGradient id="fs" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b1220" stopOpacity="0" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="80%" stopColor="#67e2f0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#67e2f0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="fs-y" cx="35%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          {flow != null && f > 0.02 && (
            <g stroke="#94a3b8" strokeOpacity={0.35 + 0.4 * f} strokeWidth="1" strokeLinecap="round">
              {[50, 82, 114].map((y) => <line key={y} x1="2" x2={14 + 10 * f} y1={y} y2={y} />)}
            </g>
          )}
          <g style={{ transition: "transform .35s ease, opacity .35s ease", opacity: glow, transform: `scale(${sSpace})`, transformOrigin: "60px 82px", transformBox: "view-box" }}>
            <g className="flame-space" style={{ animationDuration: `${(2.8 - t * 1.2).toFixed(2)}s` }}>
              <ellipse cx={cx} cy="82" rx={rx} ry={ry} fill="url(#fs)" style={{ transition: "all .35s ease" }} />
              <ellipse cx={cx + 4} cy="82" rx={rx * 0.8} ry={ry * 0.7} fill="url(#fs-y)" opacity={0.85 * f} style={{ transition: "all .35s ease" }} />
            </g>
          </g>
          <circle cx="60" cy="82" r="6" fill="#475569" />
        </svg>
        <figcaption className="mt-1 text-xs text-ink-2"><span className="font-semibold text-cyan">Microgravity</span><br />No buoyancy: oxygen arrives slowly</figcaption>
      </figure>
      <p className="col-span-2 text-[11px] leading-relaxed text-ink-3">
        Illustration, not a measurement. More oxygen ({o2.toFixed(1)}%) makes both flames bigger and brighter.
        {flow != null && <> More air flow ({flow} cm/s) stretches the space flame downstream and lets yellow back in.</>} Link et al. 2018 (p. 4):
        at low flow in microgravity the flame turns from yellow to blue and becomes rounder.
      </p>
    </div>
  )
}
