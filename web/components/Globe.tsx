"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoContains, geoDistance, geoOrthographic, geoPath, geoGraticule10 } from "d3-geo"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
import type { FeatureCollection } from "geojson"
import land110 from "world-atlas/land-110m.json"

/** Real places named in our source papers' author affiliations. City coordinates are approximate. */
export const SITES = [
  {
    id: "wstf",
    name: "NASA White Sands Test Facility",
    place: "Las Cruces, New Mexico",
    lonLat: [-106.76, 32.32] as [number, number],
    role: "Earth-gravity material flammability testing (NASA-STD-6001 Test 1). Source of our 26-material MOC table.",
    source: "NTRS 20070018178 and 20110008636 author affiliations",
  },
  {
    id: "grc",
    name: "NASA Glenn Research Center",
    place: "Cleveland, Ohio",
    lonLat: [-81.86, 41.41] as [number, number],
    role: "Microgravity combustion science: BASS, LUCI and the planned FM2 Moon experiment.",
    source: "NTRS 20110008636, 20250010653 author affiliations",
  },
  {
    id: "ucb",
    name: "UC Berkeley",
    place: "Berkeley, California",
    lonLat: [-122.26, 37.87] as [number, number],
    role: "Link et al. 2018: flame spread over PMMA rods on the ISS vs Earth, our core 'Earth vs Space' dataset.",
    source: "Link et al. 2018, Sci Rep 8:120",
  },
]

const SIZE = 560

export function Globe({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [rotation, setRotation] = useState(95)
  const raf = useRef<number | null>(null)
  const paused = useRef(false)

  const land = useMemo(() => {
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>
    return feature(topo, topo.objects.land) as unknown as FeatureCollection
  }, [])

  // Dotted continents: a 2.5° grid, kept where the point is on land.
  const dots = useMemo(() => {
    const pts: [number, number][] = []
    for (let lat = -80; lat <= 80; lat += 2.5) {
      for (let lon = -180; lon < 180; lon += 2.5) {
        if (geoContains(land, [lon, lat])) pts.push([lon, lat])
      }
    }
    return pts
  }, [land])

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    let last = performance.now()
    const tick = (t: number) => {
      if (!paused.current) setRotation((r) => (r + (t - last) * 0.006) % 360)
      last = t
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  const projection = geoOrthographic().scale(SIZE / 2 - 8).translate([SIZE / 2, SIZE / 2]).rotate([rotation, -18]).clipAngle(90)
  const path = geoPath(projection)
  const center: [number, number] = [-rotation, 18]
  const visible = (p: [number, number]) => geoDistance(p, center) < Math.PI / 2 - 0.02

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]" onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Rotating globe marking three NASA and university research sites behind our data">
        <defs>
          <radialGradient id="ocean" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1b3350" />
            <stop offset="70%" stopColor="#0b1626" />
            <stop offset="100%" stopColor="#060b14" />
          </radialGradient>
          <radialGradient id="rim" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="#67e2f0" stopOpacity="0" />
            <stop offset="100%" stopColor="#67e2f0" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 8} fill="url(#ocean)" />
        <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#67e2f0" strokeOpacity="0.07" strokeWidth="0.6" />
        {dots.map((p, i) =>
          visible(p) ? (() => {
            const xy = projection(p)
            return xy ? <circle key={i} cx={xy[0]} cy={xy[1]} r={1.25} fill="#9fdfff" fillOpacity={0.55} /> : null
          })() : null,
        )}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 8} fill="url(#rim)" />
        {SITES.map((s) => {
          if (!visible(s.lonLat)) return null
          const xy = projection(s.lonLat)
          if (!xy) return null
          const active = s.id === selected
          return (
            <g key={s.id} transform={`translate(${xy[0]} ${xy[1]})`} className="cursor-pointer" onClick={() => onSelect(s.id)}>
              <circle r={active ? 26 : 18} fill="#67e2f0" fillOpacity={0.08} stroke="#67e2f0" strokeOpacity={0.35} />
              <circle r={active ? 14 : 10} fill="#67e2f0" fillOpacity={0.15} />
              <circle r={6} fill="#67e2f0" />
              <title>{`${s.name}, ${s.place}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="sr-only">
        <ul>
          {SITES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelect(s.id)}>{s.name}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
