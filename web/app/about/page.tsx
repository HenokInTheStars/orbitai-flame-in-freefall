import { PageTitle, Panel, PanelHead } from "@/components/ui"
import { investigations } from "@/lib/data"

export const metadata = { title: "About · Flame in Freefall" }

const NTRS = [
  ["20150008962", "Zhao, T'ien, Ferkul, Olson (2015)", "BASS / BASS-II fabric flammability map"],
  ["20070018178", "Hirsch, Williams, Harper, Beeson, Pedley", "Earth-test O₂ limits of 26 spacecraft materials (10.2 psi)"],
  ["20110008636", "Hirsch, Juarez, Peyton, Harper, Olson", "How pressure and test set-up shift those limits"],
  ["20100015582", "Hirsch et al.", "Pressure limits in nearly pure oxygen"],
  ["20100019472", "Harper, Smith, Juarez, Hirsch", "Oxygen soak after 100% O₂ exposure"],
  ["20150021491", "NASA Human Research Program", "Exploration atmosphere and cabin pressures"],
  ["20180005168", "Urban et al. (2017)", "Saffire I–III samples and conditions"],
  ["20210011521", "Urban et al. (2021)", "Saffire I–V large-scale tests"],
  ["20240007488", "Saffire team, ICES 2024", "Saffire VI, heat release, CO and CO₂"],
  ["20250010653", "Ferkul, Johnston, Kralik, Liao (2025)", "LUCI: fire in spin-simulated Lunar gravity"],
  ["20260001966", "Ferkul, Kralik, Liao, Johnston (2026)", "Lunar/Martian gravity flammability, FM2 plan"],
  ["20260000646", "Ferkul et al., LPSC 2026", "FM2: first fire experiment planned on the Moon"],
  ["20040053567", "Sacksteder, Ferkul, Feier, Kumar, T'ien (2003)", "Flame spread at 0.1–0.38 g (aircraft)"],
  ["20040053582", "STS-107 Mist experiment", "Water mist vs flames in microgravity"],
  ["20120018019", "ISS fine water mist extinguisher", "Why mist replaces CO₂ on the ISS"],
  ["20070031686", "Urban et al. (2007)", "Smoke detection on the ISS"],
]

export default function AboutPage() {
  return (
    <>
      <PageTitle
        kicker="About"
        title="Built to be checked"
        lede="Flame in Freefall is OrbitAI Lab's entry to the NASA Space Apps Challenge 2026. Our rule: never invent a number. Everything here traces to a NASA dataset, a NASA report or a peer-reviewed paper, and every model output is labelled as an estimate."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHead kicker="The challenge" title="What NASA asked for, and where to find it" />
          <ul className="grid gap-3 text-sm leading-relaxed text-ink-2">
            <li><b className="text-ink">Investigations most relevant to crewed habitats</b> → the five PSI investigations below, ranked by how much test data they hold (Home).</li>
            <li><b className="text-ink">Data that supports predictive modelling</b> → three tested models and open downloads (For Scientists).</li>
            <li><b className="text-ink">Research for next-generation fire safety</b> → habitat stress test, oxygen-soak timer, extinguishing (Investigation).</li>
            <li><b className="text-ink">Earth applications</b> → water mist, smoke detection, fires in closed spaces (Explorers).</li>
          </ul>
        </Panel>

        <Panel>
          <PanelHead kicker="How it works" title="From NASA tables to this page" />
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>Download the small &ldquo;Experimental table&rdquo; CSV of each PSI investigation; never edit the originals.</li>
            <li>Clean units and typos with a Python script; keep text outcomes as text; flag anything doubtful instead of fixing it silently.</li>
            <li>Type up tables from NASA reports and papers, then check them against the PDF.</li>
            <li>Train three small models (Python, scikit-learn) and score them only on tests they never saw.</li>
            <li>Export everything for this Next.js site. The AI assistant first searches these sources, then Google Gemini writes an answer using only what was found, with citations. It passes 14–16 of our 16 test questions.</li>
          </ol>
        </Panel>

        <Panel>
          <PanelHead kicker="Limits" title="What this dashboard does not do" />
          <ul className="grid gap-2 text-sm leading-relaxed text-ink-2">
            <li>No Moon or Mars predictions: partial gravity is barely tested.</li>
            <li>No material certification. Our models describe trends in 46–256 tests.</li>
            <li>No microgravity survival model: every ISS rod test kept burning, so there is no flame-out boundary to learn.</li>
            <li>The FLEX burning-rate unit is unverified (shown &ldquo;as reported&rdquo;).</li>
            <li>Two sources disagree on Saffire-III air flow (25 vs 30 cm/s); we show both.</li>
          </ul>
        </Panel>

        <Panel>
          <PanelHead kicker="Team" title="OrbitAI Lab" />
          <p className="text-sm leading-relaxed text-ink-2">Built by</p>
          <ul className="mt-2 grid gap-1.5 text-[15px] font-medium text-ink">
            <li>Henok Solomon</li>
            <li>Melat Taye</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Code, data pipeline and README: see our public GitHub repository. Tools: Python (pandas, scikit-learn, pypdf), Next.js, Tailwind CSS,
            d3-geo, Lucide icons, Google Gemini API (copilot answers).
          </p>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead kicker="References" title="Data and sources" />
          <h3 className="label mb-2">NASA Physical Sciences Informatics (CC0, cite each DOI)</h3>
          <ul className="mb-5 grid gap-1.5 text-sm sm:grid-cols-2">
            {Object.entries(investigations).map(([id, v]) => (
              <li key={id} className="text-ink-2">
                <span className="num text-ink">{id}</span> {v.title} ·{" "}
                <a className="text-cyan hover:underline" href={v.doi_url} target="_blank" rel="noreferrer">doi:{v.doi}</a>
              </li>
            ))}
          </ul>
          <h3 className="label mb-2">NASA Technical Reports Server</h3>
          <ul className="mb-5 grid gap-1.5 text-sm sm:grid-cols-2">
            {NTRS.map(([id, who, what]) => (
              <li key={id} className="text-ink-2">
                <a className="num text-cyan hover:underline" href={`https://ntrs.nasa.gov/citations/${id}`} target="_blank" rel="noreferrer">{id}</a> · {who} · {what}
              </li>
            ))}
          </ul>
          <h3 className="label mb-2">Peer-reviewed and other</h3>
          <ul className="grid gap-1.5 text-sm text-ink-2">
            <li>Link, Huang, Fernandez-Pello, Olson &amp; Ferkul (2018). The Effect of Gravity on Flame Spread over PMMA Cylinders. Scientific Reports 8:120.{" "}
              <a className="text-cyan hover:underline" href="https://doi.org/10.1038/s41598-017-18398-4" target="_blank" rel="noreferrer">doi:10.1038/s41598-017-18398-4</a> (CC BY 4.0)</li>
            <li>NASA-STD-6001B, Test 1: Upward Flame Propagation.</li>
            <li>NASA NSSDC Planetary Fact Sheets (Earth, Moon, Mars).</li>
            <li>Map data: Natural Earth via the world-atlas package (public domain).</li>
          </ul>
        </Panel>
      </div>
    </>
  )
}
