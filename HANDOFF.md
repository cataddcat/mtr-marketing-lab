# HANDOFF — MTR Marketing Lab + MiroFish (state as of 2026-05-18, revised)

> **For the next AI agent picking up this work.** Read this top-to-bottom
> before doing anything. Everything you need is here — context, architecture,
> file paths, bugs we already hit, env structure, and the ordered next-step
> plan the user has approved.

---

## 0. TL;DR — what you're walking into

Two integrated projects on the same Windows machine, both authored by `Cat` /
`grobmak@gmail.com` for the **Marnthara** Thai curtain shop in Lopburi:

| Project | Path | Stack | Purpose |
|---|---|---|---|
| **MTR Marketing Lab** | `d:\_Projects\mtr-marketing-lab` | Vite 8 · React 19 · TS · Tailwind 4 · Valibot · Supabase · Stripe · JSZip | Ad generation + 4-persona Judge evaluation + strategy planning |
| **MiroFish** | `D:\_Projects\MiroFish` | Flask 3 · Python 3.12 · openai SDK · camel-ai · OASIS · Zep Cloud · Vue 3 | Swarm-intelligence community simulation (used as MTR's "Super-Judge") |

The user has explicitly approved an autonomous-execution working style — do
not pause for confirmation between adjacent sub-tasks (see memory file
`feedback_autonomous_execution.md`). Run validation (`npm run build` etc.)
at the end of a coherent unit, not after every file. Pause only when blocked
on external setup the user must do, or at the boundary between approved
phases.

User communicates in Thai (Bangkok dialect) — reply in Thai for non-code
discussion. Always use markdown link syntax `[label](path)` for code refs
(VSCode integration auto-renders them).

---

## 1. The 5-track master plan

The plan file lives at `C:\Users\Ygoss\.claude\plans\ads-zazzy-emerson.md`
and has the full design. Quick map:

```
Track A — Strategy Brief Layer            ←→ MTR
  Phase 1: Schema + Sheet + chip + prompt injection             [DONE]
  Phase 2: strategy_fit in AdEvaluation + StrategyFitPanel      [DONE]
  Phase 3: web-grounded brief via proxy /strategy endpoint      [pending]

Track B — Own AI Stack                    ←→ MTR
  B.1 TrainingDataset schema                                    [pending]
  B.2 Feedback widgets on every AI output                       [DONE]
  B.4 AI Provider adapter pattern (callAI registry)             [DONE]
  B.5 RAG in-browser                                            [pending]
  B.6 LoRA fine-tune Typhoon-7B                                 [pending]
  B.7-B.11 Synthesizer / Deploy / Online loop / Kaggle datasets [pending]

Track C — Obsidian + MiroFish Sync        ←→ MTR
  E1 Obsidian vault export (folders + canvas + wikilinks)       [DONE]
  E2 MiroFish board export                                      [pending]
  E3 Native folder sync (File System Access API)                [pending]
  E4 Two-way sync                                               [pending]

Track D — Online SaaS                     ←→ MTR
  D1 Supabase Auth + cloud DB + RLS + migration tool            [DONE]
  D2 Free/Paid/BYOK tier + Stripe Checkout + TierSwitcher       [DONE]
  D3 BYOK encryption                                            [pending]
  D4 Org / team workspace                                       [pending]

Track E — MiroFish Community Simulation   ←→ MTR talks to MiroFish
  M1 MTR ↔ MiroFish client + lifecycle hook + sim panel + seed  [DONE]
  M2 Super-Judge — community_sim in AdEvaluation                [NEXT]
  M3 Strategy Brief grounding via batch agent interview         [pending]
  M4 Iterative optimisation loop                                [pending]
```

---

## 2. User's approved next-step ordering (REVISED 2026-05-18)

**Original ROI-only ordering (B→D→A→C→E) was revised by Cat to put the biggest
throughput win first, then capacity, then polish.**

Baseline analysis from first successful MiroFish report (`report_4d040f994c32`):

- 5 sections generated, **112 minutes** end-to-end
- Cloud providers (SambaNova, Groq) hit rate-limit on every section start;
  every section fell back to Kaggle T4 + llama3.1:8b at ~1-2 token/s
- 13 tool calls total (panorama_search × 5, insight_forge × 5, quick_search × 2,
  interview_agents × 1)
- Tool variety: good. interview_agents under-used.
- Section 5 had one ReACT format conflict (llama3.1:8b output both tool_call +
  Final Answer), recovered

### Revised execution order (A → B → C → D → F → G → E.M2)

The logic: **A** alone gives the biggest throughput win (5 sections in parallel
≈ 4.5× speed-up) but creates a concurrent-request burst. **B** then adds the
cloud capacity needed to absorb that burst. **C** cuts per-section cost.
**D/F/G** are operational + quality polish. **E.M2** is the big MTR feature
that needs all of the above to be production-grade.

**Status as of 2026-05-18 21:00**: A, B, C, D SHIPPED + E.M2 SHIPPED (build clean, manual browser test pending).
Real-world measurement (first run, all 4 providers healthy): **114.6 min →
5.64 min (20.3×)** — Together AI absorbed Groq rate-limits during the run,
so the pipeline never fell back to Kaggle. Second run (4 → 5 section outline +
Groq TPD exhausted partway through) took 26.2 min, but most of that was
section 5 stuck in a slow Kaggle inference — neither a Task A nor Task C
regression. Task D scope was revised mid-session because a true named
tunnel needs a domain Cat doesn't own yet (see Task D notes below).
Next: Task F (qwen2.5:7b on Kaggle), G (Groq paid), then E.M2 (MTR
Super-Judge — the main MTR feature work).

| # | Task | ETA | Why this slot | Status |
|---|---|---|---|---|
| **A** | Parallel section generation in `report_agent.py` | 2h | Biggest single throughput win (112→25min, ACTUAL 5.64min). Run first so subsequent tuning lands on the right baseline. | ✅ **SHIPPED** |
| **B** | Add Together AI to MiroFish pool | 30min | Parallel sections will hit rate limits faster; Together adds 3rd cloud + $5 credit buffer. | ✅ **SHIPPED** |
| **C** | Reduce ReACT `max_rounds` 5→3 + tighten prompt | 15min | Quick win; less tokens per section; cuts the section-5 tool+Final-Answer conflict. | ✅ **SHIPPED** |
| **D** | One-liner tunnel-update workflow (replaces named tunnel) | 45min | Operational pain only. True named tunnel would need a domain (Cat has none yet), so we automated the manual-paste step instead. | ✅ **SHIPPED (modified scope)** |
| **F** | Switch Kaggle model to `qwen2.5:7b` | 15min | qwen2.5 has stronger JSON/tool-calling than llama3.1:8b. Verify with re-run after B is live. | pending |
| **G** | Upgrade Groq to paid Dev tier | 5min sign-up + $ | Cleanest fix for "all-providers-exhausted". Groq paid ≈ $0.59/M tokens (cheapest 70B around). | pending |
| **E.M2** | MTR Super-Judge — community_sim in AdEvaluation | half-day | Main MTR feature work; requires MiroFish to be fast + reliable, hence after A-G. | ✅ **SHIPPED** (build clean, end-to-end test pending) |

### Sprint 3 work completed this session (2026-05-18)

#### ✅ Task A — Parallel section generation **(SHIPPED + verified)**

**Result: 114.6 min → 5.64 min (20.3× faster)** on `sim_d13dbe3da950`.

Implementation:
- `D:\_Projects\MiroFish\backend\app\services\report_agent.py`
- New: `threading.Lock` on [ReportLogger._write_lock](D:/_Projects/MiroFish/backend/app/services/report_agent.py) for JSONL append serialisation
- New: per-report `ReportManager._file_locks` (class-level dict guarded by `_file_locks_guard`) — guards `update_progress` and `save_section` from interleaving writes between worker threads
- New: `ReportAgent.PARALLEL_SECTIONS` (class const, default 4) — controlled by env `LLM_PARALLEL_SECTIONS`. Set to 1 to roll back to legacy serial path.
- New: `_reconcile_section_transitions()` — after parallel sections complete, one ~200-token LLM call per section inserts a 2-3 sentence bridge linking it to the prior section. Restores narrative flow that parallel sections lost by not seeing each other.
- `generate_report` section loop refactored to ThreadPoolExecutor (`thread_name_prefix='section'`) with `as_completed` for fail-fast. Serial path (parallelism=1) still feeds `previous_sections` context to mirror legacy behaviour.

Baseline → after comparison:
| Metric | Baseline (`report_4d040f994c32`) | After (`report_d6f664b01c69`) |
|---|---|---|
| Wall time | 6878s (114.6 min) | **338s (5.64 min)** |
| Sections started concurrently | no (sequential) | yes — all 4 @ t=8.4s |
| Tool variety | panorama×5, insight×5, quick×2, interview×1 | insight×4, panorama×4, interview×4, quick×1 |
| Together AI utilisation | n/a (didn't exist) | served fallback calls when Groq rate-limited |

#### ✅ Task B — Together AI in MiroFish pool **(SHIPPED + verified)**

- `D:\_Projects\MiroFish\.env` updated by Cat: added `LLM_TOGETHER_*` lines + appended `together` to `LLM_PROVIDERS_LIGHT`
- Direct isolated test (`D:\_Projects\MiroFish\diag_together.py`): all 3 calls passed (short JSON 3.3s, longer JSON 3.45s, Thai output 4.39s with UTF-8 correctness)
- Backend restart logged `[provider-pool:light] initialised with 4 provider(s): sambanova, groq, together, kaggle` ✅
- During Task A live run: `'together' served call after fallback (skipped: groq(fail:RateLimitError))` — confirmed end-to-end failover
- Usage today by end of session: Together 42 calls / Groq 26 / SambaNova 28 / Kaggle 77 — Together took the brunt when free clouds rate-limited

#### ✅ Task C — Reduce ReACT max_rounds + tighten anti-conflict prompt **(SHIPPED + verified)**

`D:\_Projects\MiroFish\backend\app\services\report_agent.py`

Changes:
- `max_iterations`: 5 → `int(os.environ.get('LLM_REACT_MAX_ROUNDS', '3'))` (env override, default 3)
- `min_tool_calls`: 3 → `int(os.environ.get('LLM_REACT_MIN_TOOL_CALLS', '2'))` (env override, default 2)
- Synced prompt text: "至少调用3次" → "至少调用2次" / "每章节调用3-5次" → "每章节调用2-3次"
- Added emphatic anti-conflict block at the TAIL of `SECTION_SYSTEM_PROMPT_TEMPLATE` (prompts read tail strongest) with ASCII box drawings, ❗⛔🚫 emoji weight, and three explicit "this is wrong" examples
- Existing `conflict_retries` runtime logic (3-strike, then downgrade to tool-only) is unchanged — it's the safety net behind the prompt

Verification: `report_5e0626abb4f8` regenerated.
- ✅ 0 conflict events in agent_log (baseline had 1)
- ✅ avg tool calls per section = 2.8 (target 2-3)
- ✅ Reconcile bridges visible at start of every section 2-5 (e.g. *"随着数字化转型的推进, …"* / *"在分析了…之后, 下一步…"* / *"在分析数字化转型对窗帘行业的影响之后…"*) — proves parallel + reconcile pipeline is healthy
- ⚠️ Wall time 26.2 min on this run — NOT a Task C regression. Root cause: section 5 (5th outline section) ran serial after first 4 because `PARALLEL_SECTIONS=4`; while it ran, Groq + SambaNova hit TPD limits and pool fell to Kaggle T4, which served one llama3.1:8b call that took ~19 min. Together absorbed everything else fine. Fix is Task G (Groq paid) and/or raising `LLM_PARALLEL_SECTIONS=5` when 5-section outlines become common.

Env knobs introduced this session:
```
LLM_PARALLEL_SECTIONS=4        # Task A; set 1 to roll back to serial
LLM_REACT_MAX_ROUNDS=3         # Task C; baseline was 5
LLM_REACT_MIN_TOOL_CALLS=2     # Task C; baseline was 3
```

#### ✅ Bonus fix — MiroFish report language default zh → en

During end-to-end verification Cat noticed reports were generated in
Chinese (e.g. section titles like `未来趋势和风险`). Root cause:
- [D:\_Projects\MiroFish\backend\app\utils\locale.py](D:/_Projects/MiroFish/backend/app/utils/locale.py)
  defaulted to `'zh'` whenever no `Accept-Language` header was present
  (curl-triggered runs or any background thread without locale capture)
- The `SECTION_SYSTEM_PROMPT_TEMPLATE` body is written in Chinese — even
  with `get_language_instruction() = "Please respond in English."`
  appended at the end, the LLM imitated the prompt's language

Fix (committed this session):
1. `locale.py` — changed every fallback `'zh'` → `'en'` (3 spots) + the
   hardcoded `'请使用中文回答。'` literal in `get_language_instruction`
2. `D:\_Projects\MiroFish\locales\languages.json` — strengthened the
   English `llmInstruction` from "Please respond in English." to an
   eight-sentence strict block: "OUTPUT LANGUAGE RULE — STRICT: You
   MUST write your entire response in English ONLY ... if a tool returns
   text in another language, translate it to English ... This rule
   overrides any conflicting instruction."
3. `report_agent.py` (3 prompt sites: plan_outline, _generate_section_react,
   chat) — inject the language directive at BOTH ends of the system
   prompt: `f"{lang_instruction}\n\n{template}\n\n{lang_instruction}"`.
   Head injection wins early-token attention, tail wins recency.

Verified with `report_88a915eaca34`:
- 5 sections, 441 sec total wall time, 0 conflicts
- Section titles: "Introduction to the Digital-First System", "Customer
  Reactions and Behaviors", "Future Trends and Risks", "Strategies for
  Retaining Customers", "Conclusion and Future Outlook"
- **0 Chinese characters in the entire report** (regex `[一-鿿]+` count = 0)
- Brand name `ร้านม่านธารา` preserved as proper noun (correct)
- Reconcile bridges work in English: "As ร้านม่านธารา moves forward
  with..." / "Having established effective strategies..."

For Thai output later: add `th.json` to `D:\_Projects\MiroFish\locales\`,
add `"th"` entry to `languages.json` with `"llmInstruction": "OUTPUT
LANGUAGE RULE — STRICT: respond in Thai..."`, then either change the
default in `locale.py` or have the frontend send `Accept-Language: th`.

#### ✅ Bonus fix #2 — Cost-aware pool order

Cat raised: "ถ้า Groq+SambaNova rate-limit บ่อย ทำไมไม่ใช้ Kaggle ก่อน?
Together เสียเงิน เก็บไว้เป็น last resort"

Old order put `together` ahead of `kaggle` which meant Together's $5
credit burned even when Kaggle was healthy. New order in
`D:\_Projects\MiroFish\.env`:

```
LLM_PROVIDERS_LIGHT=groq,sambanova,kaggle,together
LLM_PROVIDERS_HEAVY=kaggle,sambanova,groq,together
LLM_PROVIDERS=kaggle,sambanova,groq,together
```

Logic:
- `groq` (1) free, ~0.7s — fastest cold-start
- `sambanova` (2) free, ~2-3s — second cloud free option
- `kaggle` (3) free unlimited, slow (1-2 tok/s on T4) — preferred over
  Together because $0 vs $0.88/M tokens
- `together` (4) **paid, last-resort emergency** — only when all three
  above are cooled down

Verified after restart 20:26:54: `[provider-pool:light] initialised with
4 provider(s): groq, sambanova, kaggle, together` — ping responded in
1.3s (groq served immediately).

Trade-off Cat accepted: when both free clouds rate-limit (likely once
the next batch of MiroFish runs eats Groq's 100K TPD), reports will
slow to ~20-40 min (Kaggle serial path) instead of staying ~5-10 min
(Together $).

#### ✅ Track E.M2 — MTR Super-Judge (community_sim in AdEvaluation) **SHIPPED**

Per the architectural guardrail [[mirofish-is-independent-platform]]:
MiroFish stayed generic; ALL ad-aware logic lives on the MTR side. No
changes to MiroFish backend code or API surface.

MTR-side files **created**:
- `mtr-marketing-lab/src/services/community-sim.ts` — orchestration:
  builds seed text from ad + brand context, drives MiroFish pipeline
  (ontology → graph → sim → interview), parses every agent's JSON
  response, aggregates into MTR-shape `CommunitySim` (sentiment, click
  intent, trust, virality signal, top objections, representative quotes)
- `mtr-marketing-lab/src/components/CommunityInsightCard.tsx` — display
  card: sentiment stacked bar, click-intent + trust + virality metric
  chips, top-objection list with counts, balanced positive/neutral/
  negative quote list
- `mtr-marketing-lab/src/components/CommunitySimConfigForm.tsx` — size
  picker before launch: 5/20/100 agents × 10/24/48 rounds presets with
  per-option time hint

MTR-side files **edited**:
- `src/lib/schemas.ts` — added `SentimentSchema`, `ObjectionItemSchema`,
  `QuoteItemSchema`, `CommunitySimConfigSchema`, `CommunitySimSchema`;
  `AdEvaluationSchema` gained optional `community_sim` block
- `src/lib/capabilities.ts` — added `community_sim_run` capability; all
  three tiers grant `true` during dev (gate flips when SaaS billing
  turns on)
- `src/services/marketing-agent.ts` — `EvaluateAdOptions.communitySim`;
  `buildJudgePrompt` takes a new arg and appends a `<COMMUNITY_SIM_RESULT>`
  block at the tail with sentiment/objections/quotes + an instruction
  telling the judge to use this as ground-truth grounding; cache key
  includes `simHash` so re-eval after a fresh sim invalidates the cache
- `src/components/AdCard.tsx` — new "Run community sim" button slot;
  shows `CommunityInsightCard` once `evaluation.community_sim` exists
- `src/App.tsx` — `communityRunning` / `communityErrors` state,
  `handleOpenCommunityConfig` + `handleStartCommunitySim` (fire-and-forget
  with toast notifications at start, sim_running milestone, interviewing
  milestone, success); `handleEvaluate` preserves prior community_sim
  on re-eval; new Sheet for the config form

Fire-and-forget UX as Cat chose:
1. Click "Run community sim" on AdCard → opens Sheet
2. Pick 5/20/100 agents × 10/24/48 rounds → click "Start simulation"
3. Sheet closes → toast "เริ่มแล้ว · 20 agents × 24 rounds"
4. Toast milestones: `sim_running` → `interviewing` → final success
5. AdCard auto-re-renders with `CommunityInsightCard` when done
6. If the user clicks `Evaluate` again, the prompt now includes the
   sentiment + objections as Super-Judge grounding context

Tier gating: `community_sim_run` is `true` for free/byok/paid in
`CAPABILITY_MATRIX`. To flip to Pro-only later: change `free` and
`byok` rows to `false`, no other code touches needed.

Build verification: `npm run build` clean (1.40s, 822 KB JS).

Pending: end-to-end browser test (requires MiroFish backend on
`:5001` + Groq/SambaNova/Together quota for ~3-5 minutes of agent
interviews). Cat to do this manually after committing.

#### 🟡 Task D — One-liner tunnel-update workflow **(SHIPPED, scope changed)**

The original plan was a Cloudflare *named* tunnel with a stable
`*.cfargotunnel.com` URL. Investigation showed that requires owning a
domain in a Cloudflare Zone, which Cat doesn't have yet. Rather than
buying a domain just for this, we automated the manual-paste step so
each Kaggle restart costs one PowerShell command instead of six manual
steps.

What was built:
- `D:\_Projects\MiroFish\kaggle_setup_v2.py` cell 6 — now prints a
  ready-to-paste PowerShell one-liner with the new tunnel URL already
  filled in (alongside the original 3-line manual paste as fallback)
- `D:\_Projects\MiroFish\scripts\update-kaggle-tunnel.ps1` — new helper
  that validates URL format, rewrites `LLM_KAGGLE_BASE_URL` (+ optional
  `LLM_KAGGLE_MODEL_NAME`) in `.env` without touching any other key,
  smoke-tests `GET /v1/models`, kills the Flask Python process(es)
  matching the MiroFish .venv, and relaunches `uv run python run.py`
  in a new window
- `D:\_Projects\MiroFish\KAGGLE_TUNNEL_UPDATE.md` — guide explaining
  the new flow + a "when you buy a domain, promote to named tunnel"
  upgrade path

Verified with dry-run (`-SkipRestart` flag): .env edited correctly,
tunnel smoke test passed HTTP 200, all other env keys (Groq /
SambaNova / Together / Zep) untouched.

Future-promotion path (in the guide): when Cat buys any domain
(`.xyz` ~$2/yr or `.com` $10.44/yr at Cloudflare-Registrar cost), the
30-min flow to enable a true `kaggle.<domain>` named tunnel is documented
step-by-step. Until then this workflow is the lowest-friction free
option.

#### Pre-flight maintenance also completed (2026-05-18)

- **MTR `.env` security**: Was tracked in git (`caa77bdb` initial commit) —
  only contained the public Cloudflare Worker URL, no secrets leaked, but
  fixed defense-in-depth before adding any API keys. Added `.env*` to
  `.gitignore` and ran `git rm --cached .env` (file stays locally).
- **Chinese (zh) removal from MTR UI**: User does not want Chinese output;
  EN-only translate retained. Changes:
  - [src/services/marketing-agent.ts](src/services/marketing-agent.ts) —
    `TargetLanguage = 'en' | 'zh'` → `'en'`, dropped `LANGUAGE_LABEL.zh`,
    removed bilingual branching from translateAd prompt
  - [src/components/TranslatePanel.tsx:24](src/components/TranslatePanel.tsx#L24) —
    `LANGS = ['en', 'zh']` → `['en']`
  - [src/components/SavedLibrary.tsx:181](src/components/SavedLibrary.tsx#L181) —
    tooltip `"แปลเป็น EN / 中文"` → `"แปลเป็น EN"`
  - `npm run build` ✅ clean

### Together AI API key handling (security)

The user obtained a Together AI key. **Storage rule**: paste into
`D:\_Projects\MiroFish\.env` ONLY (already gitignored). Never:
- ❌ Put it in MTR `.env` — MTR doesn't call Together; routing goes
  MTR → Cloudflare Worker proxy or MTR → MiroFish only
- ❌ Commit to either repo
- ❌ Echo back in chat after configuring

Cat's chosen workflow this session: Cat edits `MiroFish\.env` directly with
the 4 lines below, then tells the agent "ใส่แล้ว" → agent runs the diag
script.

### A. Parallel section generation in MiroFish report  (≈2 hr) — FIRST

- File: `D:\_Projects\MiroFish\backend\app\services\report_agent.py`
  function `generate_report` around line 1700
- Use `asyncio.gather` or `concurrent.futures.ThreadPoolExecutor(max_workers=5)`
- Each section is independent in the outline → safe to parallelise
- ⚠️ Watch out:
  - `_POOL_STATE` cooldown is thread-safe (Lock-protected) ✅
  - Zep tools may not be — wrap tool calls in lock if you see issues
  - 5 concurrent ReACT loops × ~1500 tok/section × 3 rounds (after C) = burst
    of ~22K tokens; Groq free 100K TPD = ~4 reports/day → that's why B comes
    right after, and G is the long-term fix
- Verify: generate a report end-to-end, expect ~25 min total. Check
  `report_NNN/section_*.md` timestamps are clustered, log shows interleaved
  `Executing tool` entries

### B. Add Together AI to MiroFish pool  (≈30 min) — SECOND
- Together gives ~$5 free credit, Llama 3.3 70B, OpenAI-compatible
- Sign up at https://api.together.ai, get key
- Add to `D:\_Projects\MiroFish\.env`:
  ```
  LLM_PROVIDERS_LIGHT=sambanova,groq,together,kaggle
  LLM_TOGETHER_API_KEY=<key>
  LLM_TOGETHER_BASE_URL=https://api.together.xyz/v1
  LLM_TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo
  ```
- No code changes needed — the pool loader picks up `LLM_<NAME>_*` automatically
- Verify: `D:/_Projects/MiroFish/backend/.venv/Scripts/python.exe /tmp/diag_pools.py`
  (see §8 for the diag script template)

### C. Reduce ReACT max_rounds  (≈15 min) — THIRD
- File: `D:\_Projects\MiroFish\backend\app\services\report_agent.py`
- Constant near top: search for `max_rounds` or `MAX_REACT_ROUNDS`
- Currently 6 → drop to 3
- Also tighten the ReACT system prompt: forbid both tool_call + Final
  Answer in the same response (fixes the section-5 conflict from baseline run)

### D. Cloudflare named tunnel for stable Kaggle URL  (≈45 min) — FOURTH
- Current pain: Quick Tunnel gives a new URL each Kaggle restart → user must
  paste into `.env` + restart MiroFish backend every time
- Fix: use `cloudflared tunnel login` + `cloudflared tunnel create` once on
  user's machine to get a permanent named tunnel + DNS record
- Then Kaggle script runs `cloudflared tunnel run <tunnel-name>` with the
  saved cert.pem uploaded as Kaggle Secret
- Tunnel URL becomes stable (e.g. `https://kaggle-llm.user.com`)
- File to update: `D:\_Projects\MiroFish\kaggle_setup_v2.py` — cells 5-6
- Add doc: `D:\_Projects\MiroFish\CLOUDFLARE_NAMED_TUNNEL.md`
- User-action required: register a domain (or use Cloudflare-managed
  `*.cfargotunnel.com` if no domain owned)
- **Lowered urgency now**: with A+B+G the cloud pool handles light-pool calls
  almost entirely; Kaggle becomes pure fallback. Still worth doing for
  Recovery cell reproducibility, but defer-friendly.

### F. Switch Kaggle model to qwen2.5:7b  (≈15 min) — FIFTH
- Reason: qwen2.5:7b has stronger structured-output + tool-calling than
  llama3.1:8b. Same-class size, similar speed on T4.
- File: `D:\_Projects\MiroFish\kaggle_setup_v2.py` cell 3 — change
  `MODEL = "llama3.1:8b"` → `MODEL = "qwen2.5:7b"`, then re-run cells 3-7
- Also update `D:\_Projects\MiroFish\.env`:
  `LLM_KAGGLE_MODEL_NAME=qwen2.5:7b`
- Verify with diag script + force a heavy-pool call by spinning down clouds
  temporarily (or set `LLM_PROVIDERS_HEAVY=kaggle` for the test)
- Watch out: qwen ReACT format may differ — check `ReACT generating section`
  logs for parse errors. If JSON output gets verbose preamble (qwen tendency),
  consider adding "No prose before JSON." line to system prompt.

### G. Upgrade Groq to paid Dev tier  (≈5 min sign-up) — SIXTH
- https://console.groq.com/settings/billing → add card
- Dev tier: $20/mo prepaid, ~$0.59/M tokens for Llama 3.3 70B
- Cheapest production-quality 70B in the market (2026-05-18)
- No code or `.env` change needed — same API key works
- **Estimated burn**: one full MiroFish report = ~50K tokens cloud-side =
  ~$0.03 per report. $5 paid balance ≈ 167 reports.
- After G: Kaggle becomes 100% optional / emergency-only

### E.M2. Track E M2 — MTR Super-Judge  (≈half-day, MTR side) — SEVENTH
This is the main MTR work. The previous AI completed E-M1 (client + Sheet);
M2 is the ad-card integration.

Tasks:
1. Extend `src/lib/schemas.ts` `AdEvaluationSchema` with optional `community_sim`
   block — see plan file for the exact schema
2. Add a "Run community deep-eval" button to `src/components/AdCard.tsx`
   (next to existing Evaluate button)
3. New component `src/components/CommunityInsightCard.tsx`:
   - sentiment distribution donut
   - virality forecast bar
   - top observed objections
4. Wire `useMiroFishSim` hook in `App.tsx` so the per-ad button shares the
   sim Sheet UI but with the ad pre-loaded
5. Gate behind `useCapability('community_sim_run')` — add `community_sim_run`
   to `src/lib/capabilities.ts` matrix (Pro-only)
6. New service: `src/services/community-sim.ts` that:
   - Calls MiroFish sim with the ad as seed
   - Polls for completion
   - Calls `interviewAll` with structured questions:
     - "Would you click this ad? (yes/no/maybe + why)"
     - "What objection comes to mind?"
   - Aggregates into `community_sim` shape
7. Inject `community_sim` into `evaluateAd` prompt as additional context

---

## 3. Critical files — MTR

```
src/
├── App.tsx                              [BIG — main routing, hooks, sheets, ~1200 lines]
├── lib/
│   ├── strategy-brief.ts                [A.1] schemas + formatters + hash
│   ├── ai-providers.ts                  [B.4] provider registry + role assignment + telemetry
│   ├── capabilities.ts                  [D.2] tier × capability matrix + daily usage counter
│   ├── feedback.ts                      [B.2] singleton store + thumbs schema
│   ├── demo-data.ts                     [QA] sample saved-ads + brief + quotes loader
│   ├── export-models.ts                 [C.E1] canonical export model
│   ├── wikilink.ts                      [C.E1] filename sanitiser + WikilinkRegistry
│   ├── obsidian-canvas.ts               [C.E1] .canvas JSON builder
│   ├── auth-client.ts                   [D.1] Supabase client wrapper
│   ├── mirofish-client.ts               [E.M1] MiroFish API client (Valibot-typed, 12 endpoints)
│   ├── brand-facts.ts                   [pre-existing]
│   ├── customer-quotes.ts               [pre-existing]
│   ├── schemas.ts                       [extended A.2] +StrategyFitSchema, optional strategy_fit in AdEvaluationSchema
│   ├── performance.ts                   [pre-existing]
│   ├── calibration.ts                   [pre-existing]
│   ├── ai-config.ts                     [pre-existing — wraps Cloudflare proxy at VITE_AI_PROXY_URL]
│   ├── seasonal-context.ts              [pre-existing]
│   └── niche-seeds.ts                   [pre-existing]
│
├── hooks/
│   ├── useStrategyBrief.ts              [A.1] per-campaign localStorage + edit preservation
│   ├── useAuth.ts                       [D.1] Supabase session/profile (no setState-in-effect)
│   ├── useTier.ts                       [D.2] cloud-backed tier or local
│   ├── useCapability.ts                 [D.2] gate per-feature reactive to usage
│   ├── useFeedback.ts                   [B.2] useSyncExternalStore wrapper
│   ├── useMiroFishSim.ts                [E.M1] 7-stage sim lifecycle hook
│   ├── useBrandFacts.ts                 [pre-existing]
│   └── useCustomerQuotes.ts             [pre-existing]
│
├── components/
│   ├── StrategyBriefView.tsx            [A.1] Sheet body for brief editor
│   ├── StrategyBriefBanner.tsx          [A.1] 3-state banner
│   ├── StrategyFitPanel.tsx             [A.2] per-ad strategy fit display
│   ├── FeedbackThumbs.tsx               [B.2] reusable 👍/👎 widget + popover
│   ├── ExportPanel.tsx                  [C.E1] vault export Sheet
│   ├── TierSwitcher.tsx                 [D.2] Plan + Stripe Sheet
│   ├── UpsellChip.tsx                   [D.2] inline upsell badge
│   ├── SignInScreen.tsx                 [D.1] magic-link + OAuth
│   ├── CommunitySimulationPanel.tsx     [E.M1] MiroFish sim Sheet
│   ├── AdCard.tsx                       [extended — feedback thumbs added]
│   ├── PersonaScoreCard.tsx             [extended — feedback thumbs added]
│   ├── PersonaPanelGroup.tsx            [extended — parentAdId prop]
│   └── ...                              [other pre-existing components]
│
└── services/
    ├── strategy-brief.ts                [A.1] AI brief drafter via callAI('strategist')
    ├── marketing-agent.ts               [REFACTORED B.4] routes through callAI(role)
    ├── migration.ts                     [D.1] localStorage → Supabase bulk import
    ├── billing.ts                       [D.2] Stripe Payment Links flow
    ├── export-obsidian.ts               [C.E1] vault generator + ZIP delivery
    ├── trends.ts                        [pre-existing — Cloudflare proxy]
    └── image.ts                         [pre-existing]

supabase/migrations/
└── 0001_initial.sql                     [D.1] tables + RLS + triggers + handle_new_user

.env.example                              [updated — Supabase + Stripe + MiroFish vars]
.env                                      [user's local — see below]
HANDOFF.md                                [THIS FILE]
SUPABASE_SETUP.md                         [D.1 setup guide]
STRIPE_SETUP.md                           [D.2 setup guide]
MIROFISH_SETUP.md                         [E.M1 setup guide]
```

### MTR `.env` (current)
```
VITE_AI_PROXY_URL=https://mtr-marketing-lab-proxy.cataddcat.workers.dev
VITE_MIROFISH_URL=http://localhost:5001
# VITE_SUPABASE_URL=    (empty → app runs in local-only mode)
# VITE_SUPABASE_ANON_KEY=
# VITE_STRIPE_LINK_MONTHLY= ...
```

### MTR verification commands
```powershell
cd d:\_Projects\mtr-marketing-lab
npx tsc --noEmit         # always run after type changes
npm run lint
npm run build            # IMPORTANT: catches errors tsc --noEmit misses (project references)
npm run dev              # Vite dev server on :5173
```

---

## 4. Critical files — MiroFish

```
D:\_Projects\MiroFish\
├── kaggle_setup_v2.py                              [NEW — paste cell-by-cell into Kaggle]
├── .env                                            [provider pool config — see §6]
├── docker-compose.yml                              [optional, user has no Docker]
├── MIROFISH_SETUP.md                               [setup guide (MTR side)]
├── frontend/                                       [Vue 3 + Vite — :3000]
└── backend/                                        [Flask :5001, Python 3.12]
    ├── run.py                                      [entrypoint, Windows UTF-8 setup]
    ├── pyproject.toml                              [requires-python>=3.11, deps via uv]
    ├── .venv/                                      [uv-managed, Python 3.12.13]
    ├── logs/2026-05-NN.log                         [daily logs — INCLUDE WHEN DEBUGGING]
    ├── uploads/
    │   ├── projects/                               [graph builder artifacts]
    │   ├── simulations/<sim_id>/                   [agent profiles + SQLite DBs]
    │   └── reports/<report_id>/                    [outline, sections, agent_log.jsonl]
    │
    ├── app/
    │   ├── __init__.py                             [Flask factory — installs OpenAI patch]
    │   ├── config.py                               [reads .env]
    │   ├── api/
    │   │   ├── graph.py                            [ontology + graph build endpoints]
    │   │   ├── simulation.py                       [BIG ~2700 lines, all sim endpoints]
    │   │   └── report.py                           [report agent endpoints]
    │   ├── services/
    │   │   ├── ontology_generator.py               [REFACTORED — uses LLMClient(pool='light')]
    │   │   ├── oasis_profile_generator.py         [REFACTORED — uses LLMClient(pool='light')]
    │   │   ├── simulation_config_generator.py     [REFACTORED — uses LLMClient(pool='light')]
    │   │   ├── report_agent.py                     [REFACTORED — uses LLMClient(pool='light')]
    │   │   ├── simulation_runner.py                [spawns run_*.py subprocesses]
    │   │   ├── simulation_manager.py
    │   │   ├── graph_builder.py                    [Zep wrapper]
    │   │   └── zep_tools.py
    │   │
    │   └── utils/
    │       ├── openai_factory.py                   [NEW — install_global_openai_patch + make_openai_client]
    │       ├── llm_client.py                       [REWRITTEN — multi-pool failover client]
    │       ├── logger.py
    │       └── file_parser.py
    │
    └── scripts/                                    [run as subprocess by simulation_runner]
        ├── run_parallel_simulation.py              [BOOTSTRAP PATCH at top — see §5 bug-fixes]
        ├── run_reddit_simulation.py                [BOOTSTRAP PATCH at top]
        ├── run_twitter_simulation.py               [BOOTSTRAP PATCH at top]
        └── action_logger.py
```

### MiroFish run command
```powershell
cd D:\_Projects\MiroFish
npm run backend    # cd backend && uv run python run.py — listens on :5001
# (Separate terminal)
npm run frontend   # cd frontend && npm run dev — listens on :3000
```

### MiroFish verification (run after backend changes)
Use this diag script (paste as `/tmp/diag_pools.py`):
```python
import os, sys, time, json
sys.path.insert(0, 'D:/_Projects/MiroFish/backend')
from dotenv import load_dotenv
load_dotenv('D:/_Projects/MiroFish/.env', override=True)
from app.utils.openai_factory import install_global_openai_patch
install_global_openai_patch()
from app.utils.llm_client import LLMClient, pool_status

print(json.dumps(pool_status(), indent=2, default=str))
for pool in ('light', 'heavy', 'default'):
    c = LLMClient(pool=pool)
    t0 = time.time()
    r = c.chat_json([
        {"role":"system","content":"Return JSON only."},
        {"role":"user","content":"Return json {\"pool\":\"" + pool + "\"}"}
    ], max_tokens=30)
    print(f"{pool}: {time.time()-t0:.2f}s → {r}")
```
Run: `D:/_Projects/MiroFish/backend/.venv/Scripts/python.exe /tmp/diag_pools.py`

---

## 5. Bugs encountered + fixes (DO NOT RE-LEARN THESE)

### Bug 1 — `tsc --noEmit` ≠ `npm run build`
**Symptom**: tsc passed but `npm run build` failed with type errors (missing
import for `AdIdea` from `./schemas` — should be from `marketing-agent`).
**Cause**: Vite uses `tsc -b` (project references) which catches more.
**Fix policy**: After non-trivial MTR type changes, **always run `npm run build`,
not just `npx tsc --noEmit`**. Saved as memory `feedback_verify_with_build.md`.

### Bug 2 — Dead code in `buildAdRows` (Track C.E1)
File: `src/lib/export-models.ts`
Created a `briefByHash` Map then never used it; lint missed it because
spread `...(briefByHash.size === 0 ? {} : {})` was a no-op. Removed.

### Bug 3 — `useMiroFishSim.cancel()` didn't tell backend to stop
File: `src/hooks/useMiroFishSim.ts`
User clicks Cancel → frontend aborts polling but Kaggle/MiroFish keep
burning LLM tokens. Fix: added `activeSimIdRef` + call `stopSimulation()`
fire-and-forget on cancel.

### Bug 4 — Infinite loop in run-status polling
File: `src/hooks/useMiroFishSim.ts`
`runner_status='idle'` + `totalActions=0` looped forever if engine silently
crashed. Fix: bounded grace period — `MAX_IDLE_GRACE_TICKS = 8` (≈24s)
then raises error.

### Bug 5 — `setInterval` shadowed in TierSwitcher
File: `src/components/TierSwitcher.tsx`
`const [interval, setInterval] = useState(...)` shadowed global setInterval.
Renamed to `billingInterval` / `setBillingInterval`.

### Bug 6 — react-hooks/set-state-in-effect lint rule
Files: `useAuth.ts`, `useTier.ts`, `ExportPanel.tsx`
React 19 lint forbids synchronous setState inside useEffect body.
Patterns we used to comply:
- Derive at render time instead: `const effectiveProfile = session?.user ? profile : null`
- `useMemo` instead of `useEffect + setState` for pure derivations
- Schedule async via `Promise.resolve().then(...)` if you must clear in effect

### Bug 7 — Localtunnel anti-phishing interstitial
MiroFish-side. Localtunnel serves an HTML warning page to "browsers" by
default. OpenAI SDK tries to parse as JSON → fails → 500.
**Fix**: `backend/app/utils/openai_factory.py` injects
`Bypass-Tunnel-Reminder: true` + custom User-Agent + 600s timeout, applied
both to direct callers and globally via monkey-patch on `openai.OpenAI.__init__`
so camel-ai's own client creation also gets the headers.

### Bug 8 — Localtunnel 502 Bad Gateway after ~4 min
Localtunnel free tier closes connections idle > 5 minutes. llama3.1:8b
cold-start on Kaggle T4 takes 2-4 minutes BEFORE flushing first token →
tunnel cuts out → 502.
**Fix**: Added streaming auto-default in `llm_client.py` for any base_url
matching `*.loca.lt / *.localtunnel.me / *.ngrok* / *.trycloudflare.com`.
Override via env `LLM_FORCE_STREAM=0|1`.

### Bug 9 — Kaggle session ends → Localtunnel URL dies
Each Kaggle restart yields a new tunnel URL. User must manually update
`.env` then restart MiroFish backend.
**Mitigation**: switched from Localtunnel → Cloudflare Quick Tunnel (more
stable, no 5-min idle cut, no interstitial). URL still changes per Kaggle
session. **Track D of next-step plan** is to set up Cloudflare *named*
tunnel for permanent URL.

### Bug 10 — `_thread.join()` in Cell 7 of Kaggle script kills subprocesses
File: `D:\_Projects\MiroFish\kaggle_setup_v2.py`
The block `_thread.join()` made the cell hang, so user pressed Stop →
KeyboardInterrupt propagated to subprocess.Popen children (ollama,
cloudflared) and killed everything.
**Fix**: removed `_thread.join()`. Cell now returns normally; daemon=False
thread persists in the Jupyter kernel; subprocesses are kept alive via
globals. Updated cell 2 to verify Ollama actually started (vs blindly
`time.sleep(6)`), and added a self-heal step in cell 3 that restarts
Ollama if down before pulling.

### Bug 11 — Recovery cell race condition (DNS not propagated yet)
cloudflared logs the URL very early; DNS takes 5-15s more to register at
Cloudflare's edge. `gaierror: Name or service not known` if you curl
immediately.
**Fix in recovery cell v2**: `socket.getaddrinfo(host, 443)` retry loop +
`urllib.request` retry loop with 5s backoff × 8 attempts.

### Bug 12 — Stale tunnel URL in `.env`
After Kaggle restart, user updated tunnel URL in `.env` but forgot to
restart MiroFish backend → Flask still held the old `Config.LLM_*` values
in memory.
**Fix policy**: any `.env` change requires `Ctrl+C` + `npm run backend` on
the MiroFish terminal. Tell the user explicitly each time.

### Bug 13 — Groq's `response_format=json_object` quirk
Groq requires the word "json" (case-insensitive) somewhere in the messages
when `response_format=json_object`. SambaNova/OpenAI don't.
MiroFish system prompts already contain "JSON" so we never hit it in
practice, but be aware if you add new prompts.

### Bug 14 — Rate-limited Groq + SambaNova → all-providers-exhausted
Real symptom user hit during Report Agent generation. Both clouds
collectively allow ~300K tokens/day free; one full 100-agent sim + report
needs 500K-1.5M tokens.
**Fix**: per-role pool routing (`light` = cloud-first for JSON-heavy
work; `heavy` = Kaggle-first for volume; `default` = legacy/fallback)
implemented in `llm_client.py`. See §6.

### Bug 15 — llama3.1:8b on Kaggle T4 too slow for ontology
First successful run: 595 seconds (10 min) for ontology JSON of ~500 tokens.
**Root cause**: T4 free shared tier ≈ 1 token/s for 8B model through
tunnel. **Fix**: route ontology + brief + report through `light` pool
(cloud-first). Kaggle only services the `heavy` pool. Result: ontology
back to ~5s via cloud.

### Bug 16 — JSON truncation in ontology when slow
When LLM call takes >300s, the OpenAI SDK timeout cuts mid-output → invalid
JSON → `ValueError: LLM返回的JSON格式无效: {...`. Already mitigated by
routing-to-cloud (Bug 15). Default timeout in `openai_factory.py` is now
600s, override via env `LLM_HTTP_TIMEOUT`.

---

## 6. MiroFish `.env` structure (current)

```bash
# ═══════════════════════════════════════════════════════════════════
# Pool routing — provider order per workload kind
# LIGHT  = ontology / brief / report-react (JSON-heavy, needs cloud speed)
# HEAVY  = simulation agents 100 × rounds (volume — Kaggle self-hosted)
# DEFAULT fallback when per-pool var unset = LLM_PROVIDERS
# ═══════════════════════════════════════════════════════════════════

LLM_PROVIDERS_LIGHT=sambanova,groq,kaggle
LLM_PROVIDERS_HEAVY=kaggle,sambanova,groq
LLM_PROVIDERS=kaggle,sambanova,groq

# Groq — 100K TPD free, fastest cold-start. JSON-quirk: messages must contain "json".
LLM_GROQ_API_KEY=gsk_...
LLM_GROQ_BASE_URL=https://api.groq.com/openai/v1
LLM_GROQ_MODEL_NAME=llama-3.3-70b-versatile

# SambaNova — 200K TPD free, Llama 3.3 70B
LLM_SAMBANOVA_API_KEY=...
LLM_SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
LLM_SAMBANOVA_MODEL_NAME=Meta-Llama-3.3-70B-Instruct

# Kaggle — Ollama on T4 via Cloudflare Quick Tunnel
# !!! Tunnel URL changes every Kaggle session — update after each restart !!!
LLM_KAGGLE_API_KEY=12345
LLM_KAGGLE_BASE_URL=https://<latest>.trycloudflare.com/v1
LLM_KAGGLE_MODEL_NAME=llama3.1:8b

# Cooldown tuning (defaults in seconds)
# LLM_COOLDOWN_RATELIMIT=600
# LLM_COOLDOWN_NETWORK=60
# LLM_COOLDOWN_OTHER=30
# LLM_FORCE_STREAM=0|1

# ═══════════════════════════════════════════════════════════════════
# Legacy single-provider (used when LLM_PROVIDERS empty AND by
# run_*.py simulation scripts that go through camel-ai, not LLMClient).
# Keep mirroring the first preferred Light-pool provider — typically Groq.
# IMPORTANT: when you later route camel-ai to Kaggle for 100-agent sim,
# point these vars at Kaggle (LLM_KAGGLE_*) instead.
# ═══════════════════════════════════════════════════════════════════

LLM_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL_NAME=llama-3.3-70b-versatile

# Zep Cloud — graph memory (free tier OK)
ZEP_API_KEY=z_1d...
```

---

## 7. Kaggle workflow (current, post-Bug-10 fix)

1. **One-time per Kaggle session**:
   - Open https://www.kaggle.com/code → New Notebook
   - **Settings (top-right) → Accelerator → GPU T4 x2**
   - Paste cells 1-7 from `D:\_Projects\MiroFish\kaggle_setup_v2.py` into
     separate notebook cells (the file has clear `# CELL N` delimiters)
   - Run cells 1-6 sequentially; cell 7 starts keep-alive thread and
     **exits cleanly** (the bug-10 fix) while thread + subprocesses keep
     running in the kernel
   - Copy the printed `LLM_KAGGLE_BASE_URL=...` line
   - Paste over the matching line in `D:\_Projects\MiroFish\.env`
   - Restart MiroFish backend (Ctrl+C → `npm run backend`)

2. **If Kaggle/tunnel dies mid-work** (frequent):
   - In Kaggle, paste the recovery cell (search HANDOFF or last chat for
     `🆘 RECOVERY v2`) — it restarts Ollama + tunnel, retries DNS, prints
     new URL
   - Repeat steps 4-6 from above
   - Cooldowns in MiroFish reset on backend restart (in-memory state)

3. **Model choice on Kaggle**:
   - llama3.2:3b — fast (3-5 token/s), OK for agent simulation, weak for ReACT
   - llama3.1:8b — slower (1-2 token/s), needed for Report Agent if Kaggle is the only path
   - qwen2.5:7b — alternative if llama struggles with JSON

---

## 8. How to read MiroFish log + diagnose

Daily log: `D:/_Projects/MiroFish/backend/logs/YYYY-MM-DD.log`

Key log patterns:
```
[provider-pool:light] initialised with 3 provider(s): ...
  → pool kind successfully loaded

[provider-pool] 'X' served call
  → happy path

[provider-pool] 'X' served call after fallback (skipped: Y(fail:...))
  → failover working — pool design vindicated

[provider-pool] 'X' cooldown 600s (rate-limit)
  → provider hit its TPD/RPM limit

[provider-pool] all-providers-exhausted: ...
  → genuinely no provider available; user needs to wait or top up

ReACT generating section: <title>
... LLM 响应: ...     (LLM thought)
... Executing tool: <name>, params: {...}
Section <title> generation complete (tool calls: N)
  → report agent normal flow
```

The pool's `_POOL_STATE` is in-process — restart MiroFish backend to clear
all cooldowns. Don't restart if you're mid-report unless you want to lose
state (sections already written stay on disk; in-flight section is lost).

Report artifacts: `D:/_Projects/MiroFish/backend/uploads/reports/<report_id>/`
- `meta.json` — params + status
- `outline.json` — section plan
- `progress.json` — live progress
- `section_NN.md` — written content per section
- `full_report.md` — final concatenation
- `agent_log.jsonl` — every action with elapsed_seconds (parse with python
  + Counter for analytics — see Tool-usage analysis output earlier)

---

## 9. Memory files (user-scoped, auto-loaded by Claude Code)

Location: `C:\Users\Ygoss\.claude\projects\d---Projects-mtr-marketing-lab\memory\`

```
MEMORY.md                                [index — keep <200 lines]
feedback_autonomous_execution.md         [user wants no-confirm execution]
feedback_verify_with_build.md            [use `npm run build` not just tsc --noEmit]
```

When you learn something new about how the user works, write a new file
here AND add a one-line entry to `MEMORY.md`. See Claude Code's
auto-memory docs for the frontmatter format.

---

## 10. Provider rate limit reference (2026-05-18 facts)

| Provider | Free tier limit | Paid tier | Cold start | Quality |
|---|---|---|---|---|
| Groq | **100K TPD** | $0.59/M tokens | ~1s | ★★★★★ (Llama 3.3 70B) |
| SambaNova | **200K TPD** | API priced | ~2-3s | ★★★★★ (Llama 3.3 70B) |
| Together AI | $5 credit then $0.88/M | per-second billing | ~2s | ★★★★★ (Llama 3.3 70B Turbo) — **add this next** |
| Kaggle Ollama T4 | unlimited (30hr/wk) | — | 10-60s | ★★★ (llama3.1:8b), ★★ (3.2:3b) |
| xAI Grok | grok-2-1212 deprecated; check grok-beta/grok-4 | paid | — | — |

**Sustainable budget for one full 100-agent MiroFish run**:
- Ontology + brief + sim_config (light pool, ~50K tokens) → cloud
- Agent profile generation × 100 agents (heavy pool, ~150K tokens) → Kaggle
- Simulation 24 rounds × 100 agents (heavy pool, ~300-500K tokens) → Kaggle
- Interview + report agent (light pool, ~50K tokens) → cloud
- **Cloud total ≈ 100K tokens** (within Groq+SambaNova combined free)
- **Kaggle total ≈ 450K-650K tokens** (unlimited, but takes 1-3 hours)

If user wants <30 min total per run: pay Together AI or Groq Dev tier.

---

## 11. MTR memory facts the new agent should know

- User name in git: **Cat**
- Email: **grobmak@gmail.com**
- Working on: **Marnthara curtain shop in Lopburi, Thailand**
- Target customers: 4 hardcoded personas — `family_man` / `housewife` /
  `businessman` / `genz`
- Multilingual: Thai (primary), with English + Chinese export support
- Date format in plans uses Thai-style absolute dates
- MTR Marketing Lab is a **single-shop tool** that the user may eventually
  open to other small businesses (Track D SaaS)
- MiroFish is **separate property** (cloned from `github.com/666ghj/MiroFish`)
  but they're integrated tightly via Track E

---

## 12. ⚠️ Land mines / things to NOT do

1. **Don't run `npm run build` from MiroFish directory** — that's Vue/Vite
   frontend, different package.json. MTR build is in MTR dir.
2. **Don't edit `LLM_API_KEY` in MiroFish .env without considering camel-ai**.
   The `run_*.py` simulation scripts use `os.environ['OPENAI_API_KEY']` set
   from `LLM_API_KEY`. If you point this to Kaggle, ALL agent simulation
   goes through Kaggle (which is what user wants for 100-agent runs).
3. **Don't commit `.env`**. Both projects have it gitignored.
4. **Don't try to commit `D:\_Projects\MiroFish\`** — separate repo, user
   only modifies it for their integration.
5. **Don't strip `<think>` patches from llm_client.py** — used by reasoning-
   mode models (MiniMax M2.5 etc.) that occasionally appear in `.env`
   provider lists.
6. **Don't add provider to `LLM_PROVIDERS_*` without setting all 3 env vars**
   (`LLM_<NAME>_API_KEY`, `_BASE_URL`, `_MODEL_NAME`) — pool loader logs a
   warning and silently skips the entry.
7. **Don't use `subprocess.DEVNULL` for stdout/stderr** of long-running
   processes you might need to debug. Always log to file.
8. **In Jupyter cells, don't `_thread.join()`** — Bug 10. Cells should
   return; threads + subprocesses persist as long as the kernel does.
9. **For React 19 hooks**: never `setState()` synchronously in `useEffect`
   body. Derive at render or use `useMemo` instead. See Bug 6.

---

## 13. Quick task checklist for the next agent

The revised plan (A → B → C → D → F → G → E.M2) — machine-readable:

```yaml
session_goal: |
  Continue Sprint 3 of the MTR+MiroFish integration plan. User revised the
  ordering 2026-05-18 to put biggest throughput win (A) first, then capacity
  (B), then polish. Execute autonomously per their preference; pause only at
  the boundary between A/B/C/D/F/G/E.M2.

tasks:
  - id: A
    title: Parallel section generation in report_agent.py
    files_to_edit:
      - D:\_Projects\MiroFish\backend\app\services\report_agent.py
    estimated: 2h
    verify: |
      Generate a new report. Expect ~25 min total (vs 112 min sequential).
      Check report_NNN/section_*.md timestamps — all clustered together.
      Check log for concurrent "Executing tool" entries.
    risks:
      - Zep client thread-safety (wrap with Lock if errors appear)
      - 5 concurrent LLM calls × ~1500 tokens may spike rate limit fast
        (acceptable — pool failover absorbs; B addresses this next)

  - id: B
    title: Add Together AI to MiroFish pool
    files_to_edit:
      - D:\_Projects\MiroFish\.env
    estimated: 30min
    verify: Run /tmp/diag_pools.py — see Together in light pool with cooldown_left_s=0
    user_action_required: |
      Cat already has the key (2026-05-18). Cat will paste these 4 lines
      into D:\_Projects\MiroFish\.env directly (NEVER paste into MTR .env):
        LLM_PROVIDERS_LIGHT=sambanova,groq,together,kaggle
        LLM_TOGETHER_API_KEY=<key>
        LLM_TOGETHER_BASE_URL=https://api.together.xyz/v1
        LLM_TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo
      Then run diag script. Restart MiroFish backend after .env edit.

  - id: C
    title: Reduce ReACT max_rounds + tighten prompt
    files_to_edit:
      - D:\_Projects\MiroFish\backend\app\services\report_agent.py
    estimated: 15min
    verify: |
      Re-generate a report. Each section should now show <=3 tool_call
      entries in log. Conflict warnings (tool + Final Answer) should drop.

  - id: D
    title: One-liner tunnel-update workflow (scope-modified from named tunnel)
    status: SHIPPED
    files_created:
      - D:\_Projects\MiroFish\scripts\update-kaggle-tunnel.ps1
      - D:\_Projects\MiroFish\KAGGLE_TUNNEL_UPDATE.md
    files_edited:
      - D:\_Projects\MiroFish\kaggle_setup_v2.py   # cell 6: one-liner output
    actual: 45min
    scope_change_reason: |
      True Cloudflare named tunnel (*.cfargotunnel.com) requires owning a
      domain in a Cloudflare Zone. Cat doesn't have one yet. Buying the
      cheapest .xyz is $2/yr but Cat preferred to defer. So instead of a
      stable URL, we made the URL-update step a one-liner: Kaggle cell 6
      prints a ready-to-paste PowerShell command that rewrites .env +
      restarts backend. Six manual steps -> one paste.
    verify: |
      Cat ran `.\update-kaggle-tunnel.ps1 -TunnelUrl <url> -Model <m>
      -SkipRestart` -> .env updated, smoke test HTTP 200, other env
      keys (Together/Groq/SambaNova/Zep) untouched.
    promote_to_named_tunnel_later: |
      When Cat buys a domain, KAGGLE_TUNNEL_UPDATE.md has the 7-step
      promotion playbook (cloudflared tunnel login -> create -> route dns
      -> upload cert.pem + credentials.json as Kaggle Secrets -> swap
      cell 5 to use `cloudflared tunnel run` instead of Quick Tunnel).

  - id: F
    title: Switch Kaggle model to qwen2.5:7b
    files_to_edit:
      - D:\_Projects\MiroFish\kaggle_setup_v2.py   # cell 3 MODEL var
      - D:\_Projects\MiroFish\.env                  # LLM_KAGGLE_MODEL_NAME
    estimated: 15min
    verify: |
      With LLM_PROVIDERS_HEAVY=kaggle (temporarily), run a small sim and
      observe stable JSON/tool-call output; restore pool order after.
    risks:
      - qwen may output prose preamble before JSON — tighten system prompt
        with "No prose before JSON." if seen

  - id: G
    title: Upgrade Groq to paid Dev tier
    user_action: |
      https://console.groq.com/settings/billing → add card → $20 prepay
    estimated: 5min sign-up
    cost: ~$0.59/M tokens; one full report ≈ $0.03
    verify: |
      Generate a report; rate-limit errors should disappear from log. Pool
      should serve calls primarily from Groq.

  - id: E.M2
    title: MTR Super-Judge — community_sim in AdEvaluation
    files_to_create:
      - d:\_Projects\mtr-marketing-lab\src\components\CommunityInsightCard.tsx
      - d:\_Projects\mtr-marketing-lab\src\services\community-sim.ts
    files_to_edit:
      - d:\_Projects\mtr-marketing-lab\src\lib\schemas.ts          # +community_sim
      - d:\_Projects\mtr-marketing-lab\src\lib\capabilities.ts     # +community_sim_run
      - d:\_Projects\mtr-marketing-lab\src\components\AdCard.tsx   # button + panel
      - d:\_Projects\mtr-marketing-lab\src\App.tsx                 # wiring
    estimated: 4h
    verify: |
      `npm run build` clean. Load demo data, click "Run community deep-eval"
      on an ad, observe MiroFish sim runs in background, CommunityInsightCard
      appears with sentiment dist + virality + top objections.
    gate: Pro tier (via useCapability)
```

---

## 14. End-state at handoff (2026-05-18, post-revision)

- MiroFish backend running on `:5001` (user started it after .env updates)
- MTR not running by default (user starts via `npm run dev` when needed)
- Kaggle notebook running with keep-alive thread; tunnel URL =
  `https://lobby-means-motorcycle-media.trycloudflare.com/v1` (will drift)
- Pool config: light = sambanova → groq → kaggle (cloud-first); heavy =
  kaggle → sambanova → groq (Kaggle-first); default = same as heavy
- All MiroFish services (ontology, profile gen, sim config, report agent)
  refactored to use `LLMClient(pool='light')` — verified end-to-end
- One full MiroFish report generated: `report_4d040f994c32` (1h 52min,
  5 sections, 13 tool calls)
- All MTR Sprint 1+2 tracks shipped; Sprint 3 E.M1 + bug audit + demo data
  loader done

### Changes since original handoff (this session)

- ✅ MTR `.env` un-tracked from git (`.gitignore` updated + `git rm --cached .env`).
  Local file kept; only public Cloudflare Worker URL had ever been tracked, no
  secret leak. **Future commits must not re-add `.env`** — gitignore enforces.
- ✅ Chinese (`zh`) language path removed from MTR UI per user preference.
  Translate feature now EN-only. `npm run build` ✅.
- 🟡 Task ordering revised: A → B → C → D → F → G → E.M2 (was B→D→A→C→E.M2).
  Driven by analysis that A delivers the biggest throughput win and creates
  the demand profile that B+G fix.
- ⏳ Task B (Together AI in MiroFish pool) **partially staged** — agent is
  waiting for Cat to paste the 4 env-var lines into
  `D:\_Projects\MiroFish\.env` and signal "ใส่แล้ว". Then agent runs
  `/tmp/diag_pools.py` to verify Together is registered in the light pool.

### Git state at handoff (MTR)

```
D  .env                       # removed from git index (file local-only now)
 M .gitignore                  # added .env* rules
 M MIROFISH_SETUP.md           # (from prior session — content unchanged this turn)
 M src/App.tsx                 # (from prior session)
 M src/components/SavedLibrary.tsx     # tooltip EN-only
 M src/components/TierSwitcher.tsx     # (from prior session)
 M src/components/TranslatePanel.tsx   # LANGS = ['en']
 M src/hooks/useMiroFishSim.ts # (from prior session)
 M src/lib/export-models.ts    # (from prior session)
 M src/services/marketing-agent.ts     # TargetLanguage = 'en'
?? HANDOFF.md                  # this file
?? src/lib/demo-data.ts        # (from prior session)
```

You're picking up from a healthy, working state. Don't break it.

---

## 15. Final note from the previous agent

The user is patient, technically competent, prefers Thai but understands
English code/log perfectly. They value:
- **Bias to action** over discussion
- **Empirical verification** (real run > theoretical correctness)
- **Single-flight delivery** of multi-step plans

When in doubt:
- Run the diag script, don't speculate
- Read the daily log, don't ask the user to copy it
- Save bug-fixes as memory so the next session inherits the lessons

Good luck. The path forward is clear. — Cat's previous Claude
