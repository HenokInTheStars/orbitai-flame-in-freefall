/**
 * Typed access to the JSON in public/data (written by scripts/export_web_data.py).
 * Import from SERVER components only, then pass the small slices a client component needs as props,
 * so large files (records.json) never ship to the browser.
 */
import habitatsJson from "@/public/data/habitats.json"
import materialsJson from "@/public/data/materials_moc.json"
import soakJson from "@/public/data/oxygen_soak.json"
import pgJson from "@/public/data/partial_gravity.json"
import bassJson from "@/public/data/bass_boundary.json"
import rodsJson from "@/public/data/pmma_rods.json"
import saffire2Json from "@/public/data/saffire2.json"
import saffireLargeJson from "@/public/data/saffire_large.json"
import investigationsJson from "@/public/data/investigations.json"
import recordsJson from "@/public/data/records.json"
import metricsJson from "@/public/data/metrics.json"
import model1Json from "@/public/data/model1_flame_survives.json"
import model2Json from "@/public/data/model2_spread_rate.json"
import model3Json from "@/public/data/model3_flex_burning.json"
import type { Habitat, LinearModel, MaterialMOC, PressureEffect, SoakRow } from "./science"

export const habitats = habitatsJson.presets as Habitat[]
export const places = habitatsJson.places
export const materials = materialsJson.rows as MaterialMOC[]
export const pressureEffect = materialsJson.pressure_effect as unknown as PressureEffect
export const soak = soakJson as SoakRow[]
export const partialGravity = pgJson as PartialGravityRow[]
export const bass = bassJson as BassRow[]
export const rods = rodsJson as RodRow[]
export const saffire2 = saffire2Json as RecordRow[]
export const saffireLarge = saffireLargeJson as Record<string, string | number | null>[]
export const investigations = investigationsJson as Record<string, Investigation>
export const records = recordsJson as RecordRow[]
export const metrics = metricsJson
export const model1 = model1Json as unknown as LinearModel & { earth_50pct_line_vs_iss_measured: Record<string, { earth_model_o2_at_50pct: number | null; iss_lowest_o2_with_flame_spread_measured: number | null }> }
export const model2 = model2Json as unknown as LinearModel
export const model3 = model3Json as unknown as LinearModel

export type Investigation = {
  name: string
  title: string
  doi: string
  doi_url: string
  url: string
  platform: string
  tier: number
  record_count: number
}

export type RecordRow = {
  investigation: string
  psi_id: string
  doi: string
  test_id: string
  material_or_fuel: string | null
  thickness_mm: number | null
  o2_percent: number | null
  pressure_kpa: number | null
  flow_cm_s: number | null
  flow_direction: string | null
  gravity: "micro" | "earth"
  ignited: boolean | null
  spread_rate_mm_s: number | null
  burn_length_cm: number | null
  outcome: string | null
  notes: string | null
  extra: Record<string, unknown>
}

export type BassRow = {
  test_id: string
  investigation: string
  sample_width_cm: number
  flow_start_cm_s: number
  flow_end_cm_s: number
  o2_percent: number
  outcome: string
  notes: string | null
  source: string
}

export type RodRow = {
  table: "S1" | "S2"
  gravity: "micro" | "earth"
  sample_as_printed: string | null
  d_cm: number
  o2_percent: number
  flow_cm_s: number
  flame_spread: "yes" | "no"
  spread_rate_mm_s: number | null
  notes: string | null
}

export type PartialGravityRow = {
  obs_id: string
  kind: "measured" | "finding" | "planned"
  platform: string
  gravity_g: number | null
  gravity_label: string
  material: string
  geometry: string | null
  spread_direction: string | null
  atmosphere: string | null
  quantity: string
  value: number | null
  unit: string | null
  value_1g: number | null
  ratio_partial_to_1g: number | null
  how_obtained: string
  notes: string | null
  source: string
  pdf_page: number
}

/** Headline numbers used on several pages. Computed from the data, never typed in. */
export function headline() {
  // Compare like with like: the rod size with the lowest ISS O2, and the Earth model line for that same size.
  const rodLines = model1.earth_50pct_line_vs_iss_measured
  const issBurning = rods.filter((r) => r.gravity === "micro" && r.flame_spread === "yes")
  const lowest = issBurning.reduce((a, b) => (b.o2_percent < a.o2_percent ? b : a))
  const key = Object.keys(rodLines).find((k) => Math.abs(parseFloat(k) - lowest.d_cm) < 1e-6)!
  return {
    psiTests: records.length,
    investigations: Object.keys(investigations).length,
    issLowestO2: lowest.o2_percent,
    rodSizeCm: lowest.d_cm,
    earthLineSameRod: rodLines[key].earth_model_o2_at_50pct,
    materialsTested: materials.length,
  }
}
