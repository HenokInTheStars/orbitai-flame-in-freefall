"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Menu, X } from "lucide-react"
import { openCopilot } from "@/components/Copilot"
import { useState } from "react"

export const PAGES = [
  { href: "/", label: "Home" },
  { href: "/scientists", label: "For Scientists" },
  { href: "/explorers", label: "Explorers" },
  { href: "/investigation", label: "Investigation" },
  { href: "/about", label: "About" },
]

export function Nav() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 bg-space-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-display text-lg font-extrabold tracking-wider">ORBIT</span>
          <span className="font-display text-xs font-semibold tracking-[0.3em] text-cyan">AI LAB</span>
        </Link>

        <nav className="nav-pills mx-auto hidden items-center gap-1 lg:flex" aria-label="Main">
          {PAGES.map((p) => {
            const active = p.href === "/" ? path === "/" : path.startsWith(p.href)
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active ? "bg-space-700 text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {p.label}
              </Link>
            )
          })}
        </nav>

        <div className="nav-actions ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => openCopilot()}
            aria-label="Ask the copilot"
            className="grid size-10 place-items-center rounded-full border border-line text-ink-2 hover:text-ink"
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            className="nav-burger grid size-10 place-items-center rounded-full border border-line text-ink-2 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="nav-mobile grid gap-1 px-4 pb-4 lg:hidden" aria-label="Main mobile">
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm text-ink-2 hover:bg-space-800 hover:text-ink">
              {p.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
