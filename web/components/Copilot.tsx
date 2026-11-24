"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ArrowUp, Sparkles, X } from "lucide-react"

type Msg = { role: "user" | "assistant"; text: string; sources?: { id: string; title: string; ref: string }[] }

// Suggested questions follow the tab the reader is on; any question can be asked from any tab.
const SUGGESTIONS: Record<string, { page: string; qs: string[] }> = {
  "/": { page: "Home", qs: [
    "Why can a material pass NASA's test on Earth but burn in space?",
    "Which NASA experiments matter most for crewed habitats?",
    "What do we know about fire on the Moon?",
  ] },
  "/scientists": { page: "For Scientists", qs: [
    "Why do PMMA rods keep burning at lower oxygen on the ISS?",
    "What did Saffire-II show about microgravity vs Earth burning?",
    "What controls flame blow-off in the BASS experiments?",
  ] },
  "/explorers": { page: "Explorers", qs: [
    "Why is a flame round and blue in space?",
    "How does space fire research help fire safety on Earth?",
    "How are fires detected on the ISS?",
  ] },
  "/investigation": { page: "Investigation", qs: [
    "What is the exploration atmosphere and why does it raise fire risk?",
    "How long should crews wait after breathing pure oxygen?",
    "How does water mist put out fires in microgravity?",
  ] },
  "/about": { page: "About", qs: [
    "Where does the data on this site come from?",
    "What is NASA-STD-6001 Test 1?",
    "What is FM2?",
  ] },
}

/** Open the copilot dock from anywhere; pass a question to ask it straight away. */
export function openCopilot(question?: string) {
  window.dispatchEvent(new CustomEvent("copilot:open", { detail: question }))
}

const WIDE = "(min-width: 1024px)" // docked beside the page from this width; an overlay below it

/** SI Copilot: retrieval over our cleaned data + source excerpts, answered by Google Gemini with citations.
 *  Prompt-engineered RAG only, no fine-tuning. The API route lives in app/api/copilot/route.ts.
 *  Rendered once in app/layout.tsx as a right-side dock, so it is on every page and keeps the chat across pages. */
export function Copilot() {
  const path = usePathname()
  const here = SUGGESTIONS[Object.keys(SUGGESTIONS).find((k) => k !== "/" && path.startsWith(k)) ?? "/"]
  const [open, setOpen] = useState(false)
  const [animate, setAnimate] = useState(false) // no slide-in on the first page load
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || busyRef.current) return
    busyRef.current = true
    setMsgs((m) => [...m, { role: "user", text: question }])
    setQ("")
    setBusy(true)
    try {
      const res = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "The copilot could not answer.")
      setMsgs((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources }])
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: e instanceof Error ? e.message : "The copilot could not answer." }])
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  // Docked open by default on wide screens; remember the reader's choice in this browser.
  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem("copilot-dock") } catch {}
    setOpen(saved ? saved === "1" : window.matchMedia(WIDE).matches)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.copilot = open ? "open" : "closed"
    if (open && !window.matchMedia(WIDE).matches) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const onOpen = (e: Event) => {
      enableAnimation()
      setOpen(true)
      const question = (e as CustomEvent<string | undefined>).detail
      if (question) ask(question)
      else setTimeout(() => inputRef.current?.focus(), 50)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !window.matchMedia(WIDE).matches) { enableAnimation(); setOpen(false) } }
    window.addEventListener("copilot:open", onOpen)
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("copilot:open", onOpen); window.removeEventListener("keydown", onKey) }
  }, [ask])

  // Only an explicit open/close by the reader is remembered.
  const enableAnimation = () => { setAnimate(true); document.documentElement.dataset.copilotAnim = "1" }
  const show = useCallback((v: boolean) => {
    enableAnimation()
    setOpen(v)
    try { localStorage.setItem("copilot-dock", v ? "1" : "0") } catch {}
  }, [])

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, busy])

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => show(true)}
          className="btn btn-primary fixed bottom-5 right-5 z-50 shadow-lg shadow-black/40"
        >
          <Sparkles size={16} /> Ask the data
        </button>
      )}

      <aside
        id="copilot"
        aria-labelledby="copilot-title"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col lg:w-[340px] xl:w-[400px] border-l border-line bg-space-950/95 backdrop-blur ${animate ? "transition-transform duration-300" : ""} ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-start gap-2 border-b border-line p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-space-700 text-cyan"><Sparkles size={16} /></span>
          <div className="min-w-0 flex-1">
            <div className="label">AI research assistant</div>
            <h2 id="copilot-title" className="text-lg font-semibold">Ask the data</h2>
          </div>
          <button type="button" onClick={() => show(false)} aria-label="Close the copilot" className="grid size-9 place-items-center rounded-full border border-line text-ink-2 hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4" aria-live="polite">
          <p className="text-xs leading-relaxed text-ink-3">
            It searches our NASA data and reports, then answers only from what it found, with numbered sources.
            If our sources don&apos;t cover a question, it says so instead of guessing.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="label">Ask anything, from any tab · ideas for this one</div>
            {msgs.length === 0 && (
              <div className="grid gap-2">
                {here.qs.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded-xl border border-line px-3 py-2 text-left text-xs text-ink-2 hover:border-cyan/40 hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "ml-auto max-w-[90%] bg-space-700" : "border border-line bg-space-900/60"}`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.sources && m.sources.length > 0 && (
                  <ul className="mt-3 grid gap-1 border-t border-line pt-2 text-[11px] text-ink-3">
                    {m.sources.map((s) => (
                      <li key={s.id}><span className="num text-cyan">[{s.id}]</span> {s.title} — {s.ref}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && <div className="text-sm text-ink-3">Searching the sources…</div>}
          </div>
        </div>

        <form className="m-4 mt-0 flex items-center gap-2 rounded-full border border-line bg-space-900/80 p-1.5 pl-4" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
          <label htmlFor="copilot-q" className="sr-only">Question</label>
          <input ref={inputRef} id="copilot-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about ignition, flame spread…" className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3 focus:outline-none" />
          <button type="submit" disabled={busy} aria-label="Send" className="grid size-9 place-items-center rounded-full bg-cyan text-space-950 disabled:opacity-50">
            <ArrowUp size={16} />
          </button>
        </form>
      </aside>
    </>
  )
}
