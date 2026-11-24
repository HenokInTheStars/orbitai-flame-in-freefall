import Link from "next/link"
import { ArrowUpRight, Sparkles, TriangleAlert, Moon, FlaskConical } from "lucide-react"
import { HomeHero } from "@/components/HomeHero"
import { Panel, PanelHead, Source } from "@/components/ui"
import { habitats, headline, investigations, materials, partialGravity, pressureEffect, records, rods, saffire2 } from "@/lib/data"
import { SHORT_NAME, stressTest } from "@/lib/science"

export default function Home() {
  const h = headline()
  const exploration = habitats.find((x) => x.id === "exploration")!
  const results = materials.map((m) => stressTest(m, exploration.o2_percent!, exploration.pressure_psia, pressureEffect))
  const burns = results.filter((r) => r.status === "burns").length
  const borderline = results.filter((r) => r.status === "borderline").length

  // Gravity coverage: how many measured rows exist for each gravity level
  const microRows = records.filter((r) => r.gravity === "micro").length + rods.filter((r) => r.gravity === "micro").length
  const earthRows = saffire2.filter((r) => r.gravity === "earth").length + rods.filter((r) => r.gravity === "earth").length + materials.length
  const partialRows = partialGravity.filter((r) => r.kind === "measured").length
  const coverage = [
    { label: "Microgravity (ISS, Cygnus)", n: microRows, tone: "bg-cyan" },
    { label: "Earth gravity (1-g)", n: earthRows, tone: "bg-earth" },
    { label: "Moon / Mars gravity", n: partialRows, tone: "bg-hazard" },
  ]
  const maxCov = Math.max(...coverage.map((c) => c.n))

  const invList = Object.entries(investigations).sort((a, b) => b[1].record_count - a[1].record_count)
  const maxInv = Math.max(...invList.map(([, v]) => v.record_count))

  return (
    <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="grid min-w-0 gap-5">
        <HomeHero />

        <div className="grid gap-5 md:grid-cols-3">
          <Panel className="panel-hover">
            <PanelHead kicker="Where the data is" title="Tests by gravity level" href="/scientists" />
            <ul className="grid gap-3">
              {coverage.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between text-sm"><span className="text-ink-2">{c.label}</span><span className="num">{c.n}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-space-700">
                    <div className={`h-1.5 rounded-full ${c.tone}`} style={{ width: `${Math.max(2, (c.n / maxCov) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">Only {partialRows} measured values exist for Moon-level gravity, and none on the Moon itself.</p>
            <Source>PSI tables, Link et al. 2018, NTRS 20070018178, NTRS 20250010653 / 20260001966.</Source>
          </Panel>

          <Panel className="panel-hover">
            <PanelHead kicker="NASA PSI" title="Tests per investigation" href="/scientists" />
            <ul className="grid gap-2.5">
              {invList.map(([id, v]) => (
                <li key={id} className="grid grid-cols-[92px_1fr_40px] items-center gap-2 text-sm">
                  <span className="truncate text-ink-2">{v.name}</span>
                  <span className="h-1.5 rounded-full bg-space-700"><span className="block h-1.5 rounded-full bg-cyan/80" style={{ width: `${Math.max(3, (v.record_count / maxInv) * 100)}%` }} /></span>
                  <span className="num text-right">{v.record_count}</span>
                </li>
              ))}
            </ul>
            <Source>{h.psiTests} cleaned test records from {h.investigations} PSI experimental tables (CC0, DOIs on the About page).</Source>
          </Panel>

          <Panel className="panel-hover">
            <PanelHead kicker="Cabin air" title="Habitat atmospheres" href="/investigation" />
            <ul className="grid gap-2.5">
              {habitats.map((x) => (
                <li key={x.id} className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-sm">
                  <span className="text-ink-2">{SHORT_NAME[x.id]}</span>
                  <span className="num">{x.o2_percent != null ? `${x.o2_percent}% O₂` : "O₂ n/a"} · {x.pressure_psia} psi</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">Lower pressure shortens the oxygen pre-breathe needed before spacewalks, but needs a higher oxygen share.</p>
            <Source>NTRS 20150021491, pp. 4–6. The exploration atmosphere is planned, not adopted.</Source>
          </Panel>
        </div>
      </div>

      <aside className="panel grid content-start gap-4 p-4" aria-label="AI insights">
        <div className="flex items-center justify-center gap-2 py-1 text-sm font-semibold"><Sparkles size={15} className="text-cyan" /> Data insights</div>

        <Insight
          kicker="Top finding"
          title="Flames outlast Earth's limit in orbit"
          icon={<FlaskConical size={14} />}
          text={`On the ISS, a ${h.rodSizeCm} cm PMMA rod kept burning at ${h.issLowestO2}% O₂ (measured). On Earth, our model puts the 50% survival line for the same rod size at ${h.earthLineSameRod}% (estimate).`}
          href="/scientists#earth-vs-space"
          tone="cyan"
        />
        <Insight
          kicker="Hidden hazard"
          title={`${burns} of ${materials.length} tested materials fail at 34% O₂`}
          icon={<TriangleAlert size={14} />}
          text={`In the planned exploration atmosphere (34% O₂, 8.2 psi), ${burns} materials burn in NASA's own Earth test and ${borderline} are borderline. Microgravity can be worse.`}
          href="/investigation#stress-test"
          tone="hazard"
        />
        <Insight
          kicker="Known unknown"
          title="The Moon may be the worst case"
          icon={<Moon size={14} />}
          text="NASA researchers report evidence that Lunar gravity is 'nearly the most flammable condition'. No fire has ever been tested on the Moon; FM2 will be the first."
          href="/investigation#unknowns"
          tone="warn"
        />
        <p className="px-1 text-[10px] leading-relaxed text-ink-3">
          Insights are computed from the data on build, not written by hand. Sources: Link et al. 2018; NTRS 20070018178 + 20110008636; NTRS 20260001966 p. 18.
        </p>
      </aside>
    </div>
  )
}

function Insight({ kicker, title, text, href, icon, tone }: { kicker: string; title: string; text: string; href: string; icon: React.ReactNode; tone: "cyan" | "hazard" | "warn" }) {
  const toneCls = { cyan: "text-cyan border-cyan/30 bg-cyan/10", hazard: "text-hazard border-hazard/30 bg-hazard/10", warn: "text-warn border-warn/30 bg-warn/10" }[tone]
  return (
    <Link href={href} className="panel panel-hover group block overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneCls}`}>{icon}{kicker}</span>
        <span className="grid size-8 place-items-center rounded-full border border-line text-ink-2 group-hover:text-cyan"><ArrowUpRight size={15} /></span>
      </div>
      <div className="mt-3 font-semibold leading-snug">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{text}</p>
    </Link>
  )
}
