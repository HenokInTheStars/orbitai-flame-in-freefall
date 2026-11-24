import { Droplets, Home, Radar } from "lucide-react"
import { StoryMode } from "@/components/StoryMode"
import { FlamePlayground } from "@/components/FlamePlayground"
import { PageTitle, Panel, PanelHead, Source } from "@/components/ui"
import { habitats, headline, materials, partialGravity, pressureEffect } from "@/lib/data"
import { stressTest } from "@/lib/science"

export const metadata = { title: "Explorers · Flame in Freefall" }

export default function ExplorersPage() {
  const h = headline()
  const exp = habitats.find((x) => x.id === "exploration")!
  const res = materials.map((m) => stressTest(m, exp.o2_percent!, exp.pressure_psia, pressureEffect))
  const facts = {
    issLowestO2: h.issLowestO2,
    rodSizeCm: h.rodSizeCm,
    earthLineSameRod: h.earthLineSameRod!,
    burns34: res.filter((r) => r.status === "burns").length,
    borderline34: res.filter((r) => r.status === "borderline").length,
    materials: materials.length,
    fm2O2: partialGravity.filter((r) => r.kind === "planned").map((r) => r.value!),
  }

  return (
    <>
      <PageTitle
        kicker="Explorers · for students and space fans"
        title="Why fire is different in space"
        lede="No rocket science degree needed. Take the two-minute tour, play with a flame, and see how space fire research helps fire safety back on Earth."
      />
      <div className="grid gap-5">
        <StoryMode f={facts} />

        <Panel>
          <PanelHead kicker="Try it" title="Two flames, one slider" />
          <FlamePlayground />
        </Panel>

        <section id="earth" className="scroll-mt-24" aria-labelledby="earth-title">
          <h2 id="earth-title" className="mb-4 mt-4 text-xl font-semibold">How space fire research helps on Earth</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <EarthCard
              icon={<Droplets size={18} />}
              title="Fine water mist"
              text="Many chemical fire-suppression agents were banned under the Montreal Protocol, so researchers turned to fine water mist: it needs little water and has no harmful effects on the environment. In microgravity, NASA could hold a uniform, still cloud of mist for minutes, free of the rising air currents that complicate tests on Earth, and watch how it slows a flame."
              source="NTRS 20040053582 (Mist experiment, STS-107), pp. 281–283"
            />
            <EarthCard
              icon={<Radar size={18} />}
              title="Smoke detection"
              text="A good detector must tell real smoke from dust and other harmless particles. Spacecraft detectors were designed from Earth data; NASA's SAME experiment measured smoke from spacecraft materials in microgravity, where particles can grow larger, to design better ones."
              source="NTRS 20070031686 (Urban et al. 2007); NASA SAME overview"
            />
            <EarthCard
              icon={<Home size={18} />}
              title="Fires in closed spaces"
              text="A spacecraft is the ultimate closed room: you can't open a window. Saffire burned large samples (fires of 1.5 to 3.2 kW) inside uncrewed cargo ships with 17 to 19 m³ of air and measured how much heat, carbon monoxide and carbon dioxide a real fire releases into a sealed cabin."
              source="NTRS 20240007488 (Saffire IV–VI, ICES 2024); NTRS 20210011521"
            />
          </div>
        </section>

        <Panel>
          <PanelHead kicker="Words we use" title="Mini glossary" />
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Microgravity", "Near-weightlessness, as on the space station. Things float, and hot air doesn't rise."],
              ["Partial gravity", "Gravity weaker than Earth's: about 1/6 on the Moon and about 0.38 on Mars."],
              ["Oxygen %", "How much of the air is oxygen. Earth's air is about 21%."],
              ["psi", "Pressure unit. Sea-level air is 14.7 psi; the planned Moon-base air is 8.2 psi."],
              ["MOC", "Maximum Oxygen Concentration: the most oxygen in which a material still puts its own flame out."],
              ["Flame spread rate", "How fast a flame moves along a material, here in millimetres per second."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-space-900/60 p-4">
                <dt className="font-semibold text-cyan">{t}</dt>
                <dd className="mt-1 leading-relaxed text-ink-2">{d}</dd>
              </div>
            ))}
          </dl>
          <Source>NASA NSSDC fact sheets (gravity); NTRS 20150021491 (pressures); NTRS 20070018178 (MOC).</Source>
        </Panel>
      </div>
    </>
  )
}

function EarthCard({ icon, title, text, source }: { icon: React.ReactNode; title: string; text: string; source: string }) {
  return (
    <article className="panel panel-hover flex flex-col p-5">
      <span className="grid size-10 place-items-center rounded-full bg-space-700 text-cyan">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{text}</p>
      <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-3">Source: {source}</p>
    </article>
  )
}
