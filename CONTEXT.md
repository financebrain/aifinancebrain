# CONTEXT — AI Finance Brain Current State

## Project Overview
- **Framework**: Next.js 16.2.1 with React 19.2.4
- **Backend**: Supabase (Auth + Database)
- **AI Provider**: Google Gemini API (@google/generative-ai 0.24.1)
- **Deployment**: Vercel
- **Market Data**: Yahoo Finance API, NSE/BSE live data
- **UI**: Tailwind CSS 4, Lucide icons
- **Other**: UUID for IDs, date-fns for dates, Axios for HTTP

## File Structure (Current)
```
agents/ - 8 agent modules
  ├── market-agent.js
  ├── news-agent.js
  ├── sector-agent.js
  ├── opportunity-agent.js
  ├── risk-agent.js
  ├── decision-engine.js          (combines all agent insights)
  ├── personalization-engine.js   (applies user context)
  └── portfolio-exposure-engine.js (checks portfolio overlap)

app/ - Next.js pages and routes
  ├── page.js                      (Dashboard/Home - main UI)
  ├── layout.js                    (Root layout with auth)
  ├── globals.css                  (Global Tailwind styles)
  ├── admin/page.js                (Admin dashboard)
  ├── assistant/page.js            (AI chat interface)
  ├── login/page.js                (Auth login)
  ├── market-brief/page.js         (Historical insights)
  ├── onboarding/page.js           (User setup flow)
  ├── portfolio/page.js            (Holdings management)
  └── api/
      ├── agents/market/route.js   (Market agent endpoint)
      ├── agents/news/route.js     (News agent endpoint)
      ├── agents/sector/route.js   (Sector agent endpoint)
      ├── agents/opportunity/route.js (Opportunity agent endpoint)
      ├── agents/risk/route.js     (Risk agent endpoint)
      ├── assistant/route.js       (Chat API)
      ├── chat/route.js            (Chat completions)
      ├── insights/route.js        (Query/store insights)
      ├── market-data/route.js     (Live market data)
      ├── test-weights/route.js    (Adaptive weight test endpoint)
      └── run-all/route.js         (Execute all agents + decision engine)

components/
  ├── dashboard/
  │   ├── AIInsightHero.jsx        (Main insight display)
  │   ├── MarketSnapshot.jsx       (Live prices)
  │   ├── MarketBriefSection.jsx   (Historical feed)
  │   ├── OpportunityRadar.jsx     (Opportunities)
  │   ├── RiskAlerts.jsx           (Risk warnings)
  │   ├── PortfolioCard.jsx        (Portfolio display)
  │   ├── PortfolioInput.js        (Add holdings)
  │   ├── Chatbot.js               (Chat UI)
  │   └── InsightFeed.jsx          (Insights list)
  └── ui/
      └── InsightCard.jsx          (Reusable insight card)

lib/ - Core utilities
  ├── supabase.js                  (Supabase client)
  ├── gemini.js                    (Gemini API wrapper)
  ├── user-context.js             (Get user profile + holdings)
  ├── data-fetcher.js             (Market data aggregator)
  ├── data-provider.js            (Data providers - Yahoo Finance, etc)
  ├── news-provider.js            (News data aggregator)
  ├── decision-memory.js          (Decision history, adaptive weights)
  └── json-utils.js               (JSON parsing utilities)

public/ - Static assets

Root Config Files
  ├── package.json                (Dependencies, scripts)
  ├── next.config.mjs             (Next.js config)
  ├── jsconfig.json               (JavaScript config)
  ├── middleware.js               (Auth middleware)
  ├── postcss.config.mjs          (PostCSS for Tailwind)
  ├── eslint.config.mjs           (Linting rules)
  └── .env                        (Environment variables - Supabase keys, API keys)
```

## Supabase Tables (Database Schema)
- **insights**: id, type, title, reason, confidence, suggested_action, raw_data, created_at
  - type values: 'market' | 'news' | 'sector' | 'opportunity' | 'risk' | 'decision'
- **profiles**: id (auth.users), full_name, risk_tolerance, investment_goal, experience_level, onboarding_complete
  - risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
- **holdings**: id, user_id, name, symbol, quantity, avg_buy_price, asset_type
- **feedback**: id, user_id, insight_id, rating, message (for thumbs up/down)
- **decision_history**: id, user_id, market_sentiment, sector, risk_level, accuracy_score, outcome, created_at

## Agent Architecture Pattern
Every Agent Follows This Exactly:
1. Accept userId = null parameter
2. Call getUserContext(userId) from lib/user-context.js (gets profile + holdings)
3. Fetch data via lib/data-fetcher.js (market data, prices, news, sectors)
4. Build prompt with data + userContext
5. Call callGemini(prompt) from lib/gemini.js
6. Parse JSON response (strip markdown ```json fences first)
7. Store result in Supabase insights table
8. Return result as JSON

## Agents Currently Implemented
1. **market-agent.js** - NSE/BSE indices, trend analysis
2. **news-agent.js** - Financial news impact assessment
3. **sector-agent.js** - Sector rotation opportunities
4. **opportunity-agent.js** - Buy/sell signals
5. **risk-agent.js** - Portfolio risk warnings
6. **decision-engine.js** - Synthesizes all 5 agents into final decision
7. **personalization-engine.js** - Adapts decision to user risk tolerance
8. **portfolio-exposure-engine.js** - Prevents duplicate recommendations

## API Endpoints (All POST unless noted)
- **GET /api/agents/market** - Get market analysis
- **GET /api/agents/news** - Get news analysis
- **GET /api/agents/sector** - Get sector analysis
- **GET /api/agents/opportunity** - Get opportunity signals
- **GET /api/agents/risk** - Get risk alerts
- **GET /api/run-all** - Execute ALL agents + decision engine
- **GET /api/test-weights** - Test adaptive dynamic weights
- **POST /api/insights** - Query/store insights
- **POST /api/chat** - Chat completions (uses Gemini)
- **GET /api/market-data** - Live market prices
- **POST /api/assistant** - Assistant endpoint

## What Is Currently Working ✅
- Live NSE/BSE market data (Nifty, Bank Nifty, IT Index, Gold, USD/INR)
- 8 AI agents generating specific insights with real numbers
- AI chat answering questions like "How to allocate ₹30,000 as aggressive investor"
  → Responds: "60% IT ₹18,000 via ICICI Prudential IT ETF, 40% banking ₹12,000"
- Auth: Supabase login, onboarding flow, middleware protecting all routes
- Portfolio page with real holdings management
- Market Brief page with historical insights feed
- Deployed on Vercel
- Personalization context applied to all insights
- Adaptive decision scoring and memory system with dynamic weights
- Real database-backed decision history and outcome tracking
- Decision engine using weighted scoring and recency-based learning

## Current Bugs / Known Issues ⚠️
1. Dashboard not loading insights on page open
   → Root Cause: useEffect in app/page.js not fetching on mount properly
   → Fix Needed: Ensure useEffect has proper dependency array and auth check
2. Duplicate insights accumulating after multiple "Run AI Analysis" clicks
   → Root Cause: Delete query in app/api/run-all/route.js not working
   → Fix Needed: Implement proper Supabase delete before insert
3. Mobile navbar broken — logo too large, links cramped
   → Root Cause: Responsive design not implemented in app/layout.js
   → Fix Needed: Tailwind responsive classes (sm:, md:, lg:)

## Phase Progress
**Phase 1 (MVP): ✅ COMPLETE**
- Basic agents, auth, portfolio, market data

**Phase 2 (Real Product): 🔄 IN PROGRESS**
- ✅ Auth, onboarding, portfolio, user context, personalised agents
- ✅ Decision engine combining agents
- ✅ Portfolio exposure engine
- ✅ Adaptive decision memory system with dynamic weights
- ✅ Real database-backed decision history and testing
- ❌ Feedback thumbs on insight cards (UI done, backend incomplete)
- ❌ Admin dashboard (page exists, functionality missing)
- ❌ Bug fixes above

**Phase 3 (Autonomous Platform): ⏳ NOT STARTED**
- Vercel Cron Jobs for automatic daily runs
- Agent memory system (learning from past decisions)
- Agent collaboration (agents debating decisions)
- Outcome tracking (measuring accuracy over time)

## Vision
Build the financial guardian every ordinary Indian deserves.
AI that never sleeps, never misses a signal, always explains in plain English.
Target: The 100 million new investors entering Indian markets who have 
never read a balance sheet in their lives.