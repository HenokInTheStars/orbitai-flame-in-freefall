/**
 * Illustration only: an Earth-gravity flame (buoyant teardrop, yellow from soot) next to a
 * microgravity flame (round, dimmer and bluer). Shapes follow the physics described in the sources;
 * size grows with oxygen but is NOT a measurement or a prediction.
 * Link et al. 2018 (p. 4, Fig. 4): in microgravity at low flow the flame turns from yellow to blue and rounder.
 */
export function FlameVisual({ o2, compact = false }: { o2: number; compact?: boolean }) {
  const s = 0.75 + Math.min(Math.max((o2 - 15) / 25, 0), 1) * 0.5 // 0.75..1.25 visual scale
  const h = compact ? 150 : 200
  return (
    <div className="grid grid-cols-2 content-start gap-3 self-start">
      <figure className="rounded-xl border border-line bg-space-900/60 p-3 text-center">
        <svg viewBox="0 0 120 160" style={{ height: h }} className="mx-auto" role="img" aria-label="Illustration of a flame in Earth gravity: tall teardrop, yellow">
          <defs>
            <radialGradient id="fe" cx="50%" cy="75%" r="70%">
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="flame-earth" transform={`translate(60 135) scale(${s}) translate(-60 -135)`}>
            <path d="M60 18 C 78 55, 92 80, 88 108 C 85 128, 72 140, 60 140 C 48 140, 35 128, 32 108 C 28 80, 42 55, 60 18 Z" fill="url(#fe)" />
            <path d="M60 70 C 68 90, 72 102, 70 116 C 68 128, 64 132, 60 132 C 56 132, 52 128, 50 116 C 48 102, 52 90, 60 70 Z" fill="#60a5fa" fillOpacity="0.55" />
          </g>
          <rect x="44" y="140" width="32" height="10" rx="2" fill="#475569" />
        </svg>
        <figcaption className="mt-1 text-xs text-ink-2"><span className="font-semibold text-earth">Earth (1 g)</span><br />Hot gas rises, pulls in fresh air</figcaption>
      </figure>
      <figure className="rounded-xl border border-line bg-space-900/60 p-3 text-center">
        <svg viewBox="0 0 120 160" style={{ height: h }} className="mx-auto" role="img" aria-label="Illustration of a flame in microgravity: round, blue, dim">
          <defs>
            <radialGradient id="fs" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b1220" stopOpacity="0" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="80%" stopColor="#67e2f0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#67e2f0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="flame-space" transform={`translate(60 82) scale(${s}) translate(-60 -82)`}>
            <circle cx="60" cy="82" r="44" fill="url(#fs)" />
          </g>
          <circle cx="60" cy="82" r="6" fill="#475569" />
        </svg>
        <figcaption className="mt-1 text-xs text-ink-2"><span className="font-semibold text-cyan">Microgravity</span><br />No buoyancy: oxygen arrives slowly</figcaption>
      </figure>
      <p className="col-span-2 text-[11px] leading-relaxed text-ink-3">
        Illustration, not a measurement. Size grows with O₂ ({o2.toFixed(1)}%). Colour and shape follow Link et al. 2018 (p. 4): at low flow in
        microgravity the flame turns from yellow to blue and becomes rounder.
      </p>
    </div>
  )
}
