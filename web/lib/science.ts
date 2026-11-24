/**
 * All dashboard science in one file, so every formula can be shown to judges.
 * Inputs come from web/public/data/*.json (written by scripts/export_web_data.py).
 * Nothing here invents data: functions either look up measured values or evaluate the
 * exported model formulas, and every model output must be shown with an "estimate" label.
 */

// ---------- Habitat atmospheres ----------

export type Habitat = {
  id: string
  name: string
  pressure_kpa: number
  pressure_psia: number
  o2_percent: number | null
  source: string
  notes: string | null
}

export const SHORT_NAME: Record<string, string> = {
  iss: "ISS cabin",
  alternative: "Alternative (Shuttle staged)",
  exploration: "Exploration atmosphere",
  eva: "EVA suit",
}

// ---------- #1 Habitat stress test ----------

export type MaterialMOC = {
  material: string
  composition: string
  category: string
  moc_qualifier: "=" | "<" | ">"
  moc_percent_o2: number
  pressure_psia: number
  observations_at_moc: string | null
  notes: string | null
  source: string
}

export type PressureEffect = {
  slope_min_pct_per_psia: number // -0.251
  slope_max_pct_per_psia: number // -0.975
  valid_for_moc_range_pct: [number, number]
  source: string
}

export type StressStatus = "burns" | "borderline" | "self-extinguishes" | "untested"

export type StressResult = {
  status: StressStatus
  /** MOC range at the habitat pressure. Equal to the measured MOC when pressures match. */
  mocLow: number
  mocHigh: number
  /** true when mocLow/mocHigh were shifted with the published pressure slope (an estimate) */
  estimated: boolean
  /** Habitat O2 minus the (most favourable) MOC, in percentage points. Positive = above the limit. */
  marginPts: number
  why: string
}

/**
 * MOC = the highest O2 % at which a material still self-extinguishes in NASA's Earth test
 * (NASA-STD-6001 Test 1). Above its MOC the material burns.
 *
 * NASA measured these MOCs at 10.2 psia. When the habitat pressure differs, we shift the MOC with the
 * published linear pressure dependence  MOC = m·Pt + b  with m between -0.251 and -0.975 % O2 per psia
 * (NTRS 20110008636, Eq. 1). Lower pressure -> higher MOC. The shift gives a RANGE and is labelled an estimate.
 *
 * Status rules (habitat O2 = x):
 *   x above the whole MOC range       -> "burns"              (fails NASA's Earth test in this atmosphere)
 *   x inside the MOC range            -> "borderline"
 *   x at or below the whole MOC range -> "self-extinguishes"
 *   MOC only known as "< v" or "> v"  -> decided only when x is clearly past v, else "untested"
 */
export function stressTest(m: MaterialMOC, o2: number, psia: number, pe: PressureEffect): StressResult {
  const dP = psia - m.pressure_psia // negative when the habitat pressure is lower than the test pressure
  const shiftA = pe.slope_min_pct_per_psia * dP
  const shiftB = pe.slope_max_pct_per_psia * dP
  const estimated = Math.abs(dP) > 0.05
  const lowShift = estimated ? Math.min(shiftA, shiftB) : 0
  const highShift = estimated ? Math.max(shiftA, shiftB) : 0
  const v = m.moc_percent_o2
  const mocLow = v + lowShift
  const mocHigh = v + highShift

  if (m.moc_qualifier === "=") {
    const status: StressStatus = o2 > mocHigh ? "burns" : o2 > mocLow ? "borderline" : "self-extinguishes"
    return { status, mocLow, mocHigh, estimated, marginPts: o2 - mocHigh, why: `MOC ${v}% at ${m.pressure_psia} psia` }
  }
  if (m.moc_qualifier === "<") {
    // MOC is somewhere below v: it already burned at v. It surely burns at any O2 above the shifted v.
    if (o2 >= mocHigh) return { status: "burns", mocLow, mocHigh, estimated, marginPts: o2 - mocHigh, why: `burned at ${v}% (MOC below ${v}%)` }
    return { status: "untested", mocLow, mocHigh, estimated, marginPts: NaN, why: `only known: MOC below ${v}%` }
  }
  // ">": it still self-extinguished at v
  if (o2 <= mocLow) return { status: "self-extinguishes", mocLow, mocHigh, estimated, marginPts: o2 - mocLow, why: `self-extinguished at ${v}%` }
  return { status: "untested", mocLow, mocHigh, estimated, marginPts: NaN, why: `only known: MOC above ${v}%` }
}

/** Measured microgravity gap (PMMA rods only): how much lower O2 a flame survived on the ISS
 *  than the Earth model's 50% line, per rod size. From models/metrics.json. */
export function microgravityGap(lines: Record<string, { earth_model_o2_at_50pct: number | null; iss_lowest_o2_with_flame_spread_measured: number | null }>) {
  const gaps = Object.values(lines)
    .filter((l) => l.earth_model_o2_at_50pct != null && l.iss_lowest_o2_with_flame_spread_measured != null)
    .map((l) => (l.earth_model_o2_at_50pct as number) - (l.iss_lowest_o2_with_flame_spread_measured as number))
  return { min: Math.min(...gaps), max: Math.max(...gaps) }
}

// ---------- Exported linear models (models/*.json) ----------

export type LinearModel = {
  features: string[]
  scaler_mean: number[]
  scaler_scale: number[]
  coefficients_standardized: number[]
  intercept: number
  valid_ranges: Record<string, unknown>
}

export function linear(m: LinearModel, x: Record<string, number>) {
  return m.features.reduce((z, f, i) => z + (m.coefficients_standardized[i] * (x[f] - m.scaler_mean[i])) / m.scaler_scale[i], m.intercept)
}

/** Model 1: probability a flame keeps spreading on a PMMA rod in EARTH gravity. */
export function flameSurvivesEarth(m: LinearModel, o2: number, rodDiameterCm: number) {
  const z = linear(m, { o2_percent: o2, inv_rod_d: 1 / rodDiameterCm })
  return 1 / (1 + Math.exp(-z))
}

/** Model 2: flame spread rate over PMMA rods, mm/s. */
export function spreadRate(m: LinearModel, o2: number, flowCmS: number, rodDiameterCm: number, micro: boolean) {
  const isMicro = micro ? 1 : 0
  return linear(m, {
    o2_percent: o2,
    log_flow: Math.log(flowCmS),
    inv_rod_d: 1 / rodDiameterCm,
    is_micro: isMicro,
    micro_x_o2: isMicro * o2,
  })
}

/** Model 3: FLEX droplet burning rate, as reported in PSI-69 (unit unverified). */
export function flexBurningRate(m: LinearModel, x: { o2: number; kpa: number; co2: number; he: number; heptane: boolean; d: number }) {
  return linear(m, { o2_percent: x.o2, pressure_kpa: x.kpa, co2_fraction: x.co2, he_fraction: x.he, is_heptane: x.heptane ? 1 : 0, droplet_d_mm: x.d })
}

export function inRange(v: number, r: [number, number]) {
  return v >= r[0] && v <= r[1]
}

// ---------- #4 Oxygen soak ----------

export type SoakRow = {
  scenario: string
  porosity: string
  material: string
  moc_percent_o2: number
  time_to_moc_hms: string
  time_to_moc_hours: number
  time_to_moc_minutes: number
  exceeds_30_min_rule: "yes" | "no"
  notes: string | null
  source: string
}

export function formatDuration(minutes: number) {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`
  const h = minutes / 60
  if (h < 48) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} days`
}
