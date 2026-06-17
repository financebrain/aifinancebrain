# AI Finance Brain — Project Status Report (generated 2026-06-16)

## Current state (what’s built)

This repository is a **Next.js 16 (App Router) + React 19** application that provides:

- **A dashboard web UI** (`app/page.js`) that shows the latest AI “insights” and a final synthesized “decision” card.
- **An agent-based analysis pipeline** (5 core agents + decision synthesis) triggered by `GET /api/run-all`, storing outputs into Supabase.
- **A chat/assistant layer**:
  - `POST /api/chat`: decision-engine-grounded “thinking assistant” that is constrained to not pick stocks.
  - `POST /api/assistant`: short educational assistant that uses latest stored insights as context.
- **A newer “dual-mode system” abstraction** for:
  - **Trading mode**: quant/scoring + execution plan generation + trade journaling to Supabase (`trading_trades`).
  - **Investing mode**: LLM/agent-style advice composition (currently looks partially stubbed / inconsistent).
- **A memory + adaptive weighting layer** (`lib/decision-memory.js`) that computes dynamic weights from `decision_history` and can also incorporate trade outcomes from `trading_trades`.

## Tech stack

- **Framework**: Next.js `16.2.1` (App Router)
- **Frontend**: React `19.2.4`, Tailwind `4`, lucide-react
- **Backend**: Next.js route handlers (`app/api/**/route.js`)
- **AI/LLM**: Groq SDK + Google Generative AI SDK present; `lib/gemini.js` is the main wrapper used by `POST /api/chat` and some agents
- **Data**: `yahoo-finance2`, plus direct Yahoo chart fetch in `/api/run-all`
- **DB/Auth**: Supabase (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`)

## High-level architecture map

### Core “insights” pipeline (dashboard)

- **UI**: `app/page.js`
  - Loads latest insights using `GET /api/insights`
  - Listens to Supabase realtime INSERTs on `insights` and reloads
  - Shows a “WHY?” drawer built from `finalDecision.why`

- **Orchestrator**: `GET /api/run-all`
  - Gets user session (Supabase auth helpers)
  - Builds a **sector exposure** map from user `holdings` (server-side price lookup)
  - Runs agents in parallel:
    - `agents/market-agent.js`
    - `agents/news-agent.js`
    - `agents/sector-agent.js`
    - `agents/opportunity-agent.js`
    - `agents/risk-agent.js`
  - Calls `agents/decision-engine.js` which now delegates scoring to `lib/quant-engine.js`
  - Applies personalization + portfolio exposure adjustments
  - Stores the final “decision” in Supabase `insights` with `type: 'decision'`

### Quant / trading subsystem

- **Quant decision core**: `lib/quant-engine.js`
  - Converts signals into a score, adjusts with learned “patterns”
  - Determines action (`buy | accumulate | hold | avoid`)
  - Produces confidence + execution plan inputs
  - Can store a trade record via `lib/trade-journal.js`

- **Decision memory**: `lib/decision-memory.js`
  - `getDynamicWeights()` from `decision_history`
  - `getSignalImpact()` / `getSignalPatterns()` for pattern data
  - `getRealPatterns(userId)` extracts patterns from **closed** `trading_trades`
  - `saveDecisionHistory()` inserts to `decision_history`
  - `updateDecisionOutcome()` updates a decision when an exit price is known

- **Trading engine**: `engines/trading/engine.js`
  - Calls `buildDecisionAsync()` and produces a stop loss / take profit / position sizing plan

- **Trade journaling**: `lib/trade-journal.js`
  - Writes to Supabase `trading_trades` (or an in-memory fallback if Supabase isn’t configured)

## Frontend (what users see)

- **Main dashboard**: `app/page.js`
  - Shows “decision” card if there is a stored decision insight.
  - Has a real-time “Engine Active” header and uses IST time formatting.
  - Includes components in `components/dashboard/*` such as:
    - `AIInsightHero.jsx`, `MarketSnapshot.jsx`, `OpportunityRadar.jsx`, `RiskAlerts.jsx`, `Chatbot.js`, `PortfolioInput.js`, etc.

## API endpoints (implemented in repo)

### Existing “dashboard” endpoints (tracked)

- **Run everything**: `GET /api/run-all` (`app/api/run-all/route.js`)
- **Fetch latest run insights**: `GET /api/insights` (`app/api/insights/route.js`)
- **Agent-only routes**:
  - `GET /api/agents/market`
  - `GET /api/agents/news`
  - `GET /api/agents/sector`
  - `GET /api/agents/opportunity`
  - `GET /api/agents/risk`
- **Chat (decision-engine-grounded)**: `POST /api/chat` (`app/api/chat/route.js`)
- **Assistant (brief educational)**: `POST /api/assistant` (`app/api/assistant/route.js`)
- **Market indicators**: `GET /api/market-data` (`app/api/market-data/route.js`) — pulls quotes via `yahoo-finance2`
- **Decision weights test**: `GET /api/test-weights` (tracked)
- **Patterns**: `GET /api/patterns` returns `getSignalPatterns()`

### New/untracked endpoints (present in working tree per git status)

These route folders exist in the working tree but are currently **untracked** (not committed yet):

- `app/api/trading/route.js` — `POST` → `runSystem(input,'trading')`
- `app/api/investing/route.js` — `POST` → `runSystem(input,'investing')`
- `app/api/trading-test/route.js` — `GET` creates and stores an “open” trade in `trading_trades`
- `app/api/update-trade/route.js` — `POST` closes a trade based on exitPrice
- `app/api/trade-stats/route.js` — `GET` returns user trade stats

## Supabase usage (data model implied by code)

The code clearly uses these tables:

- **`insights`**: agent outputs + decision output, grouped by `run_id`
- **`profiles`**: onboarding gate in `middleware.js` (expects `onboarding_complete`)
- **`holdings`**: portfolio holdings used by `/api/run-all` for sector exposure
- **`portfolios`**: fetched in `/api/run-all` (used by portfolio-context engine)
- **`decision_history`**: stores decision outcomes for adaptive weights / patterns
- **`trading_trades`**: stores trade plans + outcomes for quant/trading learning
- (Optional) **`learning_data`**: referenced by `recordLearning()` in `lib/trade-journal.js`

## What you “built” (summary by subsystem)

### Phase 1 (agent dashboard foundation)

- 5 core agents exist and are wired into `GET /api/run-all`.
- `GET /api/insights` returns the latest run grouped by `run_id`.
- Dashboard shows decision + “WHY” breakdown and listens to realtime inserts.

### Phase 2/3 additions (quant + trading + adaptive learning)

- Decision engine now incorporates a **quant scoring system** (`lib/quant-engine.js`) and can be pattern-enhanced using either:
  - `decision_history` patterns (signal patterns), or
  - real user patterns derived from closed `trading_trades` (`getRealPatterns(userId)`).
- Trade journaling + stats endpoints exist (currently untracked).
- Dynamic weights are computed and blended with trade-based learning.

## Notable inconsistencies / risk areas (based on current code)

- **`engines/investing/engine.js` looks inconsistent** with how your agents are defined:
  - It calls `runMarketAgent(market)` etc., but your agent functions typically take `(userId, runId)` and internally fetch data.
  - This suggests the investing engine is either **unfinished**, or it needs a different agent interface.

- **Two “assistant/chat” concepts exist**:
  - `POST /api/chat` is strict and context-heavy.
  - `POST /api/assistant` is brief and reads recent DB insights directly.
  - This is fine, but it can be confusing unless the UI clearly differentiates them.

- **Supabase client patterns are mixed**:
  - `lib/supabase.js` exports a client that is sometimes used server-side.
  - There are also new helpers: `lib/supabase-server.js` / `lib/supabase-browser.js`.
  - Consider consolidating to one consistent server/client approach to avoid auth/cookie surprises.

## Build status vs your workspace checklist (`.cursorrules`)

Your checklist said “dashboard needs 5 corrections”:

- **Fix 1 (market data endpoint)**: `app/api/market-data/route.js` exists and returns indicators from Yahoo.
- **Fix 5 (live clock)**: `app/page.js` already contains a live IST clock + greeting logic.
- **Fix 2 (replace assistant route)**: `app/api/assistant/route.js` is updated to a “Groq provider” style prompt and uses Supabase insights as context.
- **Fix 3 (fetchFinancialNews)**: not verified here (this repo has `lib/data-fetcher.js` but no `fetchFinancialNews` function in the portion reviewed).
- **Fix 4 (market agent prompt)**: not verified here (requires checking `agents/market-agent.js` content).

## Git working tree snapshot (what’s changed right now)

### Modified (tracked)

- `agents/decision-engine.js`
- `app/api/run-all/route.js`
- `app/api/test-decision/route.js`
- `lib/decision-memory.js`
- `lib/supabase.js`

### Untracked (new files/folders)

- API routes:
  - `app/api/investing/route.js`
  - `app/api/trading/route.js`
  - `app/api/trading-test/route.js`
  - `app/api/update-trade/route.js`
  - `app/api/trade-stats/route.js`
- Engines:
  - `engines/investing/engine.js`
  - `engines/trading/engine.js`
- Libraries:
  - `lib/quant-engine.js`
  - `lib/system.js`
  - `lib/trade-journal.js`
  - `lib/supabase-server.js`
  - `lib/supabase-browser.js`
- Scripts/tests/docs (untracked):
  - `scripts/create_trading_trades_table.sql`
  - multiple `scripts/qa-*.mjs` and `scripts/qa-*.json`
  - `test-execution*.js`, `test-trade-generation.js`, `verify-patterns.js`
  - `updated.md`

## Recommended next steps (practical)

- **Stabilize the investing engine**:
  - Decide whether “investing mode” should use the existing agents as-is (userId/runId-driven), or accept externally supplied data.
  - Update `engines/investing/engine.js` accordingly so it’s not calling agent functions with the wrong signatures.

- **Consolidate Supabase patterns**:
  - Use cookie-aware server clients inside API routes that need auth.
  - Use browser client only for realtime / client-side calls.

- **Decide what becomes “product” vs “dev tools”**:
  - Keep `qa-*` scripts and test routes gated behind `NODE_ENV=development` or removed from production builds.

- **Commit/organize the new trading subsystem**:
  - The trading endpoints + engines + quant engine are substantial and should be committed as a coherent unit once the investing engine interface is resolved.

