import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/Nav"
import { Copilot } from "@/components/Copilot"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const orbitron = Orbitron({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-orbitron" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "Flame in Freefall · OrbitAI Lab",
  description:
    "Earth-safe isn't space-safe. NASA microgravity combustion data turned into fire-safety insights for spacecraft and lunar habitats.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} ${jetbrains.variable}`}>
      <body>
        <div className="stars" aria-hidden />
        <div className="dock-shift relative z-10">
          <Nav />
          <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-[1400px] px-4 pb-10 text-xs text-ink-3 sm:px-6">
            <div className="border-t border-line pt-6">
              Built by Henok Solomon and Melat Taye (OrbitAI Lab) · NASA Space Apps Challenge 2026 · Data: NASA Physical Sciences Informatics (CC0, cite each
              DOI), NASA Technical Reports Server, Link et al. 2018 (CC BY 4.0). Every number on this site traces to a
              source listed on the About page. Model outputs are labelled as estimates.
            </div>
          </footer>
        </div>
        <Copilot />
      </body>
    </html>
  )
}
