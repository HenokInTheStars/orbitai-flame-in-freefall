import Link from "next/link"
import { ArrowUpRight, Info, TriangleAlert } from "lucide-react"

export function Panel({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`panel p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function PanelHead({ title, kicker, href }: { title: string; kicker?: string; href?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker && <div className="label mb-1">{kicker}</div>}
        <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      </div>
      {href && (
        <Link href={href} aria-label={`Open ${title}`} className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-space-800 text-ink-2 hover:text-cyan">
          <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  )
}

/** Small "where this number comes from" line. Every data panel ends with one. */
export function Source({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-3">Source: {children}</p>
}

/** Required on every model output (CLAUDE.md: label any estimate as an estimate). */
export function EstimateTag({ text = "Model estimate, not a measurement" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-[11px] font-medium text-warn">
      <Info size={12} /> {text}
    </span>
  )
}

export function MeasuredTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[11px] font-medium text-cyan">
      Measured
    </span>
  )
}

export function Hazard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-hazard/30 bg-hazard/10 px-3 py-2 text-sm text-hazard">
      <TriangleAlert size={16} className="mt-0.5 shrink-0" /> <span>{children}</span>
    </div>
  )
}

export function PageTitle({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <div className="mb-8 mt-6 max-w-3xl">
      <div className="label mb-2 text-cyan">{kicker}</div>
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-wide sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-2">{lede}</p>
    </div>
  )
}

export function Stat({ value, label, tone = "ink" }: { value: string; label: string; tone?: "ink" | "cyan" | "earth" | "hazard" }) {
  const color = { ink: "text-ink", cyan: "text-cyan", earth: "text-earth", hazard: "text-hazard" }[tone]
  return (
    <div className="min-w-0">
      <div className={`num text-3xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs leading-snug text-ink-2">{label}</div>
    </div>
  )
}
