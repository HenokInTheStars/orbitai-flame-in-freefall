# SI Copilot evaluation

**What is tested:** 16 questions in [copilot_eval.csv](copilot_eval.csv). 13 can be answered from our sources, 2 are off-topic and must be declined, and 1 asks for a Mars prediction, which the copilot must not make.

**How:** run `python scripts/eval_copilot.py <site url>` against the running site. It calls the real API route: retrieval, then Gemini. Each answer is scored automatically:

| Kind | Passes when |
|---|---|
| answer | It cites at least one source as [n], does not open by saying the sources don't cover the question, and one cited source is in the expected list |
| refuse | It says our sources don't cover the question |
| no_prediction | It says Moon/Mars behaviour is untested or unknown instead of predicting it |

The latest answers are in [copilot_eval_results.csv](copilot_eval_results.csv).

## Results (2026-11-24, gemini-3.5-flash-lite)

| Run | Change before the run | Passed | Typical time |
|---|---|---|---|
| 1 | None (baseline). Main model was 3.5 Flash | 11/16 | ~22 s (Flash timed out; the fallback answered) |
| 2 | Scorer now reads grouped citations like [1, 2]. Thermo property tables removed from the knowledge base | 14/16 (2 Gemini 503 errors) | 2–22 s |
| 3 | Flash Lite made the main model, with one retry | 16/16 | 1–3 s |
| 4 | Clearer model facts in the knowledge base. Scorer now fails answers that open with a disclaimer | 15/16 | 1–3 s |
| 5 | Prompt: no opening disclaimer; mention Moon/Mars only when asked | 14/16 | 1–3 s |

**Read this as 14–16 of 16 with the final setup.** Gemini's answers vary between runs, and the set is small.

**What the failures were:**
- **CP-14, before the fix:** the copilot "answered" a titanium question from a NASA thermodynamic table: a wrong fact with a citation. Those 564 table pages (half the knowledge base) are now excluded; see `NOT_INDEXED` in `scripts/build_knowledge_base.py`. In every later run it declines the question.
- **CP-12:** said "our sources do not cover a flame survival model" and then described it. The knowledge-base summary now uses plain model names and is computed from `models/metrics.json`.
- **Run 5, CP-02 and CP-11:** the answers were correct but cited a valid secondary source, such as an NTRS report that describes NASA-STD-6001 Test 1 instead of the standard itself. We left the expected sources unchanged rather than tune the test to the copilot.

**Limits:**
- 16 questions, written by the team.
- The scorer checks citations and refusals, not whether every sentence is true. A person should still read `copilot_eval_results.csv`.
- [rag_test_questions.csv](rag_test_questions.csv) is the older template and is replaced by this set.
