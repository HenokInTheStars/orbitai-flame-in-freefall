"use client"

import { useState } from "react"
import { FlameVisual } from "./FlameVisual"

/** Explorers page: drag the oxygen slider and watch both flames. Illustration only. */
export function FlamePlayground() {
  const [o2, setO2] = useState(21)
  const where = o2 >= 33 ? "like the planned Moon-base air (34%)" : o2 >= 26 ? "like the Space Shuttle's low-pressure mode (26.5%)" : o2 >= 20 ? "like the air you breathe (about 21%)" : "below normal air"
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
      <div className="min-w-0">
        <label htmlFor="play-o2" className="label">Oxygen in the air</label>
        <div className="num mt-2 text-5xl font-semibold text-cyan">{o2.toFixed(0)}%</div>
        <p className="mt-1 text-sm text-ink-2">{where}</p>
        <input id="play-o2" type="range" min={15} max={40} step={1} value={o2} onChange={(e) => setO2(parseFloat(e.target.value))} className="mt-5 w-full" />
        <ul className="mt-5 grid gap-2 text-sm leading-relaxed text-ink-2">
          <li><b className="text-earth">On Earth</b>, hot gas is lighter, so it rises and pulls fresh air in underneath. That makes the familiar tall, yellow, flickering flame.</li>
          <li><b className="text-cyan">In microgravity</b>, nothing rises. Oxygen only reaches the flame by slowly spreading in, so the flame becomes a dim blue ball.</li>
        </ul>
      </div>
      <FlameVisual o2={o2} />
    </div>
  )
}
