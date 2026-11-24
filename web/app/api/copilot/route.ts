/**
 * SI Copilot API route: retrieval-augmented answers with citations.
 * 1. BM25 keyword search over data/kb.json (PDF pages + summaries of our cleaned data,
 *    built by scripts/build_knowledge_base.py).
 * 2. Google Gemini answers ONLY from the retrieved excerpts and cites them as [1], [2]…
 * Prompt-engineered RAG; no fine-tuning. Needs GEMINI_API_KEY in the environment (web/.env.local locally; Vercel → Settings → Environment Variables).
 */
import kbJson from "@/data/kb.json"

type Chunk = { chunk_id: string; kind: "paper" | "data"; title: string; ref: string; url: string; family: string; text: string }
const KB = kbJson as Chunk[]

// Team decision 2026-11-15: Google Gemini. Override with GEMINI_MODEL in the environment.
// Re-tested 2026-11-24 (scripts/eval_copilot.py): 3.5 Flash Lite answered every call in ~1-3 s and passed the
// evaluation; 3.5 Flash was rate-limited (429) or took >20 s, and 3.8 Flash was overloaded. So Lite is the main
// model, retried once after a short pause on overload, with 3.5 Flash as the last resort.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"
const FALLBACK_MODEL = "gemini-3.5-flash"
const ATTEMPTS = [MODEL, MODEL, FALLBACK_MODEL]
const TIMEOUT_MS = 9_000 // 3 attempts + pauses stay under maxDuration
const RETRY_PAUSE_MS = 1_500

// Vercel: allow the function enough time for retrieval + up to three model calls.
export const maxDuration = 30
const TOP_K = 8
const MAX_QUESTION = 500

// ---------- BM25 retrieval (built once per server instance) ----------
const STOP = new Set("the a an and or of to in on for with is are was were be by as at from that this it its into than then which what why how does do did can could would should about over under not no".split(" "))
const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9%.\-µ ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))

const docs = KB.map((c) => tokenize(`${c.title} ${c.title} ${c.text}`))
const avgLen = docs.reduce((a, d) => a + d.length, 0) / docs.length
const df = new Map<string, number>()
for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1)
const tfs = docs.map((d) => { const m = new Map<string, number>(); for (const w of d) m.set(w, (m.get(w) ?? 0) + 1); return m })

function search(q: string, k = TOP_K) {
  const terms = Array.from(new Set(tokenize(q)))
  const N = docs.length, k1 = 1.4, b = 0.75
  const scored = KB.map((c, i) => {
    let s = 0
    for (const t of terms) {
      const f = tfs[i].get(t)
      if (!f) continue
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * docs[i].length) / avgLen)))
    }
    if (c.kind === "data") s *= 1.5 // our verified summaries first when equally relevant
    return { c, s }
  })
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.c)
}

// ---------- Very small abuse guard (per server instance, best effort) ----------
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 8
}

const SYSTEM = `You are the SI Copilot of "Flame in Freefall", a NASA Space Apps dashboard about fire safety in microgravity and future habitats.
Rules:
- Answer ONLY from the numbered source excerpts in the user message. Cite every factual sentence with [n].
- If the excerpts do not answer the question, say plainly that our sources do not cover it. Do not use outside knowledge, and never invent numbers, papers or results.
- Say "estimate" for anything from our models, and "measured" or "calculated" when the source says so.
- If the excerpts answer the question, answer directly; do not open with a disclaimer.
- No Moon or Mars predictions: only if the question asks about the Moon or Mars, say what was measured and that the rest is unknown.
- Write for a curious non-expert: short paragraphs, plain words, at most about 180 words.`

export async function POST(req: Request) {
  let question = ""
  try {
    question = String((await req.json()).question ?? "").trim()
  } catch {
    return Response.json({ error: "Send JSON like {\"question\": \"…\"}." }, { status: 400 })
  }
  if (!question) return Response.json({ error: "Type a question first." }, { status: 400 })
  if (question.length > MAX_QUESTION) return Response.json({ error: `Please keep questions under ${MAX_QUESTION} characters.` }, { status: 400 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  if (limited(ip)) return Response.json({ error: "Too many questions in a minute. Please wait a moment and try again." }, { status: 429 })
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return Response.json({ error: "The copilot isn't configured yet: GEMINI_API_KEY is not set on the server." }, { status: 503 })
  }

  const found = search(question)
  if (found.length === 0) {
    return Response.json({ answer: "Our sources don't cover that question. Try asking about flame spread, oxygen, habitat atmospheres, suppression or partial gravity.", sources: [] })
  }
  const context = found.map((c, i) => `[${i + 1}] ${c.title} — ${c.ref}\n${c.text}`).join("\n\n---\n\n")

  // Gemini REST API: POST /v1beta/models/{model}:generateContent. Main model, one retry, then the fallback.
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: `Source excerpts:\n\n${context}\n\n---\n\nQuestion: ${question}` }] }],
    generationConfig: { maxOutputTokens: 4096 },
  })
  let res: Response | null = null
  let lastError = ""
  let usedModel = ""
  for (const [attempt, model] of ATTEMPTS.entries()) {
    if (attempt > 0 && (res?.status === 429 || res?.status === 503)) await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS))
    usedModel = model
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        signal: controller.signal,
        body,
      })
      if (res.ok) break
      lastError = `status ${res.status}`
      if (res.status === 401 || res.status === 403) break // a bad key won't work on the fallback either
    } catch (e) {
      res = null
      lastError = e instanceof Error && e.name === "AbortError" ? "timeout" : "network"
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    if (!res || !res.ok) {
      if (res?.status === 429) return Response.json({ error: "The copilot is busy. Try again in a minute." }, { status: 429 })
      if (res?.status === 401 || res?.status === 403) return Response.json({ error: "The copilot's API key was rejected." }, { status: 503 })
      if (lastError === "timeout") return Response.json({ error: "The copilot took too long to answer. Please try again." }, { status: 504 })
      return Response.json({ error: `The copilot service is unavailable right now (${lastError}).` }, { status: 502 })
    }
    const data = await res.json()
    const cand = data.candidates?.[0]
    if (!cand || cand.finishReason === "SAFETY" || data.promptFeedback?.blockReason) {
      return Response.json({ answer: "The copilot can't answer that question.", sources: [] })
    }
    const answer = (cand.content?.parts ?? [])
      .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
      .map((p: { text: string }) => p.text)
      .join("")
      .trim()
    return Response.json({
      answer: answer || "Our sources don't cover that question.",
      sources: found.map((c, i) => ({ id: String(i + 1), title: c.title, ref: c.ref })),
      model: usedModel,
    })
  } catch {
    return Response.json({ error: "The copilot could not read the answer. Please try again." }, { status: 502 })
  }
}
