# MiroFish Setup (Track E)

MTR Marketing Lab integrates with **MiroFish** — a swarm-intelligence engine
that simulates communities of LLM agents on Twitter+Reddit-style platforms.
Use it to predict community reactions to ads, ground Strategy Briefs in
realistic agent voice, and run iterative optimization loops.

## TL;DR (Windows, no Docker required)

```powershell
# 1. Ensure MiroFish .env has LLM_API_KEY + ZEP_API_KEY filled
cd D:\_Projects\MiroFish
# If .venv missing, run once:  npm run setup:all
# Requires Python 3.11–3.12 (uv will manage). uv handles the virtualenv.

# 2. Start MiroFish backend (Flask on :5001)
npm run backend

# 3. Verify (new terminal)
curl http://localhost:5001/health
# → {"status": "ok", "service": "MiroFish Backend"}

# 4. Point MTR at it — add to d:\_Projects\mtr-marketing-lab\.env:
#    VITE_MIROFISH_URL=http://localhost:5001

# 5. Restart MTR dev server
cd d:\_Projects\mtr-marketing-lab
npm run dev
```

The Fish icon in the MTR header turns on once `VITE_MIROFISH_URL` is set →
click it to open the Community Simulation panel.

> **Don't have Docker?** That's fine — the source-code option above is the
> primary path. Docker is just a convenience wrapper. See section 2 for both.

## 1. MiroFish configuration

MiroFish needs two third-party keys:

### LLM API
Any OpenAI-compatible endpoint. MiroFish's recommended option is **Alibaba
Bailian / Qwen-plus** (cost-effective for large agent populations):

```env
LLM_API_KEY=sk-...
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL_NAME=qwen-plus
```

Alternatives that also work:
- OpenAI: `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL_NAME=gpt-4o-mini`
- Groq (proxy): same `LLM_BASE_URL` pattern
- Local Ollama / vLLM: `LLM_BASE_URL=http://localhost:11434/v1`

⚠️ **Cost**: a single simulation = hundreds to thousands of LLM calls
(N agents × M rounds × actions/round). For Marnthara use case, start small:
- `max_rounds=24` (≈1 simulated day) in MTR's CommunitySimulationPanel
- Test with 30–50 agents first; scale up after seeing results

### Zep Cloud (memory backend)
Free tier is enough for tens of simulations per month.

1. Sign up at <https://app.getzep.com>
2. Create a project → copy API key
3. Set `ZEP_API_KEY=...` in MiroFish `.env`

## 2. Running MiroFish

### Option A: Docker compose (recommended)
```bash
cd D:\_Projects\MiroFish
docker compose up -d
docker compose logs -f          # tail logs
docker compose down             # stop
```

Ports exposed: `3000` (their frontend, optional), `5001` (backend API — required by MTR).

### Option B: Source-code dev
```bash
cd D:\_Projects\MiroFish
npm run setup:all               # one-time
npm run backend                 # starts on :5001
```

Python 3.11–3.12 + `uv` required. The `setup:all` step creates a `.venv` and
installs deps via `uv sync`.

### Option C: Cloud (Render/Railway/Modal)
Roll your own Docker deployment when you scale beyond local. Set
`VITE_MIROFISH_URL=https://your-deployment.example.com` in MTR's `.env`.
CORS is already enabled in MiroFish (`flask_cors` with `origins=*`),
so no extra config is needed.

## 3. MTR ↔ MiroFish data flow

```
MTR (browser)
  │
  │ POST multipart /api/graph/ontology/generate
  │   ↳ seed text + simulation requirement
  ▼
MiroFish backend (Flask :5001)
  │
  │ extract text + LLM call → ontology + project_id
  ▼
POST /api/graph/build  →  task_id
  │ poll /api/graph/task/{task_id}
  ▼
graph_id ready
  │
  │ POST /api/simulation/create
  ▼
simulation_id
  │ POST /api/simulation/prepare  (LLM generates agent profiles)
  │ POST /api/simulation/prepare/status — poll until ready
  │ POST /api/simulation/start  (run N rounds)
  │ GET  /api/simulation/{id}/run-status — poll until done
  │ GET  /api/simulation/{id}/posts + /comments
  ▼
MTR shows posts + comments + (future) sentiment + virality scores
```

## 4. Sprint roadmap

| Sprint | What lands |
|---|---|
| **E-M1** (✅ now) | Top-nav Fish icon → Sheet · seed upload + sim lifecycle + raw post/comment view |
| **E-M2** | "Run community sim" button per AdCard · `community_sim` in AdEvaluation schema · sentiment/virality scoring |
| **E-M3** | Strategy Brief "Ground from community" · batch interview agents to derive JTBD/objections from real-looking voice |
| **E-M4** | Iterative loop: generate → sim → rewrite → sim again until threshold |

## 5. Troubleshooting

**Fish icon missing in header?** → `VITE_MIROFISH_URL` empty. Set it in `.env`, restart `npm run dev`.

**Sim panel says "MiroFish ยังไม่ได้ตั้งค่า"?** → same as above.

**CORS error in browser console?** → MiroFish CORS is `origins=*` by default. If you've changed `flask_cors` config in `app/__init__.py`, restore it or add `http://localhost:5173` to the allowlist.

**Ontology generation fails / no response?** → check MiroFish logs:
- LLM API key valid? Try `curl` directly against `$LLM_BASE_URL`.
- Seed text too long? Default `chunk_size=500` should handle most inputs.

**Build graph task stuck?** → Zep API key invalid or quota exhausted. Check Zep dashboard.

**Sim starts but no posts after a long wait?** → max_rounds too low and agents haven't been triggered. Increase to 48+.

**LLM cost concerns?** → Set hard caps in MiroFish `.env`:
- `MAX_AGENTS=30` (default may be higher)
- `MAX_ROUNDS=24`
- Switch `LLM_MODEL_NAME` to a cheaper model

## 6. Security note for production

The current MTR ↔ MiroFish wire is direct browser → MiroFish API. For
multi-tenant SaaS (when Track D opens to multiple businesses), proxy
MiroFish behind MTR's Cloudflare Worker:

- Worker authenticates the Supabase JWT
- Worker rate-limits per Pro user
- Worker forwards to MiroFish with internal-only auth
- MTR frontend talks to `mtr-proxy.example.com/api/sim/*` instead of `:5001`

Defer until you have real paying users.
