# AI FINANCE BRAIN — COMPLETE TECHNICAL DETAILS

## TABLE OF CONTENTS
1. [Project Architecture](#project-architecture)
2. [Database Schema](#database-schema)
3. [Authentication Flow](#authentication-flow)
4. [Data Pipeline — How Insights Are Generated](#data-pipeline)
5. [Agent System — The 8 Agents](#agent-system)
6. [Decision Engine Logic](#decision-engine-logic)
7. [API Endpoints — Complete Reference](#api-endpoints)
8. [Frontend Components & Flow](#frontend-components--flow)
9. [Core Utilities & Libraries](#core-utilities--libraries)
10. [Complete Code Walkthroughs](#complete-code-walkthroughs)

---

## PROJECT ARCHITECTURE

### High-Level System Design
```
┌─────────────────────────────────────────────────────────────┐
│  USER BROWSER (Frontend)                                    │
│  - Dashboard (app/page.js)                                  │
│  - Portfolio Input                                          │
│  - Chatbot                                                  │
│  - "Run AI Analysis" Button                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Requests
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  NEXT.JS API ROUTES (Backend)                               │
│  /api/run-all ────────────► Orchestrates all agents        │
│  /api/chat ───────────────► AI chat endpoint               │
│  /api/insights ───────────► Fetch latest insights          │
│  /api/market-data ───────► Live price data                 │
│  /api/agents/[type] ─────► Individual agent endpoints      │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           │ Agents execute                      │ Auth/Session
           ▼                                      ▼
┌─────────────────────────┐         ┌──────────────────────────┐
│  AGENTS (agents/)       │         │  SUPABASE               │
│ ├─ Market Agent        │         │ ├─ Auth (users)         │
│ ├─ News Agent          │         │ ├─ Profiles            │
│ ├─ Sector Agent        │         │ ├─ Holdings            │
│ ├─ Opportunity Agent    │         │ ├─ Insights (DB)       │
│ ├─ Risk Agent          │         │ ├─ Feedback            │
│ ├─ Decision Engine      │         │ └─ Portfolios          │
│ ├─ Personalization      │         └──────────────────────────┘
│ └─ Portfolio Exposure   │
└───────┬────────────────┘
        │ Each agent calls
        ▼
┌─────────────────────────┐
│  GEMINI/GROQ LLM        │
│  (AI language model)    │
│  - Analyzes data        │
│  - Generates JSON       │
└─────────────────────────┘
        │ Returns
        ▼
┌─────────────────────────┐
│  DATA SOURCES           │
│ ├─ Yahoo Finance        │
│ ├─ Alpha Vantage        │
│ ├─ News APIs            │
│ ├─ Static Fallback Data │
└─────────────────────────┘
```

### Key Technologies
- **Framework**: Next.js 16.2.1 (App Router)
- **Frontend**: React 19.2.4, Tailwind CSS 4
- **Backend**: Node.js with Next.js API routes
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Google Gemini (via Groq client)
- **Data**: Yahoo Finance API, Alpha Vantage
- **Auth**: Supabase Auth Helpers

---

## DATABASE SCHEMA

### Supabase Tables & Structure

#### 1. `profiles` — User Settings & Context
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY (references auth.users.id),
  full_name TEXT,
  risk_tolerance TEXT, -- 'conservative' | 'moderate' | 'aggressive'
  investment_goal TEXT, -- 'long-term-growth' | 'short-term-profit' | etc.
  experience_level TEXT, -- 'beginner' | 'intermediate' | 'advanced'
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Purpose**: Stores user preferences used by personalization engine
**Used By**: `lib/user-context.js`, `agents/personalization-engine.js`

#### 2. `holdings` — User's Stock Portfolio
```sql
CREATE TABLE holdings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT, -- e.g., "TCS"
  symbol TEXT, -- e.g., "TCS"
  quantity INT,
  avg_buy_price NUMERIC,
  asset_type TEXT, -- 'stock' | 'etf' | 'mutual_fund'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Purpose**: Tracks what stocks/ETFs user owns
**Used By**: `app/api/run-all/route.js` (builds portfolio exposure map)

#### 3. `insights` — AI-Generated Insights
```sql
CREATE TABLE insights (
  id UUID PRIMARY KEY,
  run_id UUID, -- groups all agents from one run
  user_id UUID REFERENCES auth.users(id),
  type TEXT, -- 'market' | 'news' | 'sector' | 'opportunity' | 'risk' | 'decision'
  title TEXT,
  reason TEXT, -- detailed explanation
  confidence TEXT, -- 'high' | 'medium' | 'low'
  suggested_action TEXT,
  raw_data JSONB, -- full agent output
  created_at TIMESTAMP
);
```

**Purpose**: Stores all AI-generated insights for later retrieval
**Used By**: `app/page.js` (displays insights), `app/api/insights/route.js`

#### 4. `feedback` — User Ratings
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  insight_id UUID REFERENCES insights(id),
  rating INT, -- 1-5 or thumbs up/down
  message TEXT,
  created_at TIMESTAMP
);
```

**Purpose**: Tracks user feedback on insights (for Phase 3)
**Status**: Partially implemented

---

## AUTHENTICATION FLOW

### Step 1: Login (app/login/page.js)
User enters email/password → Supabase Auth handles it
```
Browser → /login → Supabase Auth UI → Sets auth session cookie
```

### Step 2: Middleware Protection (middleware.js)
Every request passes through middleware:
```javascript
// middleware.js checks:
1. Is user logged in? (via session cookie)
   - NO → Redirect to /login
   - YES → Continue

2. Has user completed onboarding?
   - NO & NOT on /onboarding → Redirect to /onboarding
   - YES → Access granted
```

### Step 3: Protected Routes
```
✅ PUBLIC (no auth needed):
  - /login
  - /onboarding
  - /api/* (but checked inside routes)

❌ PROTECTED (auth required):
  - / (dashboard)
  - /portfolio
  - /market-brief
  - /admin
  - /assistant
```

### Step 4: Session in API Routes
```javascript
// Inside any API route:
const supabase = createServerClient(...) // with cookies
const { data: { session } } = await supabase.auth.getSession()
const userId = session?.user?.id // Extract user ID
```

---

## DATA PIPELINE — How Insights Are Generated

### Complete Flow (When User Clicks "Run AI Analysis")

```
1. USER ACTION
   └─ Dashboard → "Run AI Analysis" button
   
2. BROWSER REQUEST
   └─ GET /api/run-all
   
3. API RECEIVES REQUEST
   ├─ Extract session & userId
   ├─ Fetch user's holdings from holdings table
   ├─ Map holdings to sectors (INFY→IT, HDFCBANK→Banking, etc.)
   ├─ Calculate sector exposure % (e.g., 60% IT, 40% Banking)
   
4. PARALLEL AGENT EXECUTION
   ├─ Fetch market data from Yahoo Finance / Alpha Vantage
   ├─ Run 5 agents in parallel (Promise.allSettled):
   │  ├─ Market Agent ──────────→ Analyzes Nifty, sector moves
   │  ├─ News Agent ────────────→ Analyzes headlines
   │  ├─ Sector Agent ──────────→ Identifies rotation signals
   │  ├─ Opportunity Agent ─────→ Finds opportunities
   │  └─ Risk Agent ────────────→ Flags risks
   
5. DECISION ENGINE SYNTHESIS
   ├─ Take results from all 5 agents
   ├─ Combine into single coherent strategy
   ├─ Apply portfolio context (e.g., "You already own 45% IT")
   
6. PERSONALIZATION
   ├─ Fetch user profile (risk tolerance, goals)
   ├─ Adjust recommendation based on profile
   ├─ Adapt tone and urgency
   
7. STORE IN DATABASE
   ├─ Save all individual agent insights to insights table
   ├─ Save final decision to insights table
   ├─ Use run_id to group all insights from this execution
   
8. RETURN TO FRONTEND
   └─ JSON with all results + final decision
   
9. FRONTEND DISPLAYS
   ├─ Main insight (from decision engine)
   ├─ Impact on user's portfolio
   ├─ Suggested action
   ├─ Next step guidance
   └─ "Why?" button to see reasoning
```

---

## AGENT SYSTEM — The 8 Agents

### Universal Agent Pattern
Every agent follows this EXACT sequence:

```javascript
export async function runXyzAgent(userId = null, runId = null) {
  // STEP 1: Fetch data
  const data = await getMarketData(); // or getNewsData()
  
  // STEP 2: Get user context
  const userContext = await getUserContext(userId);
  
  // STEP 3: Build prompt for LLM
  const prompt = `You are [role]. Here is data: [data]. ${userContext}
                  Respond ONLY with valid JSON: { ... }`;
  
  // STEP 4: Call LLM
  const rawResponse = await callGemini(prompt);
  
  // STEP 5: Parse JSON
  let parsed = JSON.parse(rawResponse); // strip ```json ``` first
  
  // STEP 6: Store in Supabase
  await supabase.from('insights').insert({
    type: 'xyz',
    title: parsed.title,
    reason: parsed.summary,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    run_id: runId,
    raw_data: { ...parsed, original_data }
  });
  
  // STEP 7: Return
  return parsed;
}
```

### AGENT 1: Market Agent (agents/market-agent.js)

**Purpose**: Analyze Nifty 50 and broader market sentiment

**Input Data**:
```
- Nifty 50 price
- Nifty 50 change %
- All sector movements
```

**Agent Prompt**:
```
"You are a senior financial analyst.
Today's Nifty: ₹22,800 (+0.2%)
Sectors: Banking -0.62%, IT +2.6%, Auto -0.4%, ...

Write daily morning brief. Be specific with numbers.
Respond with JSON: { title, summary, strong_sectors, 
weak_sectors, key_signal, confidence, suggested_action }"
```

**Output JSON**:
```json
{
  "title": "Tech strength leads market",
  "summary": "IT sector up 2.6% despite banking weakness...",
  "strong_sectors": ["IT", "FMCG"],
  "weak_sectors": ["Banking", "Auto"],
  "key_signal": "IT outperformance vs banking rotation",
  "confidence": "high",
  "suggested_action": "Monitor IT momentum for broader strength"
}
```

**Stored As**: `insights` table with `type: 'market'`

---

### AGENT 2: News Agent (agents/news-agent.js)

**Purpose**: Analyze financial headlines and sentiment

**Input Data**:
```
- Recent financial news articles
- Each with sentiment label: [BULLISH], [BEARISH], [NEUTRAL]
```

**Agent Prompt**:
```
"You are a financial news analyst.
Headlines:
[BULLISH] RBI cuts rates to boost growth (Reuters)
[NEUTRAL] TCS Q3 earnings meet expectations (ET)
[BEARISH] Inflation concerns resurface (CNN)

Extract key signals for investors. Respond with JSON:
{ title, summary, impacted_sectors, sentiment, confidence, 
  suggested_action }"
```

**Output JSON**:
```json
{
  "title": "Mixed signals on monetary policy",
  "summary": "RBI rate cut positive but inflation persists...",
  "impacted_sectors": ["Banking", "FMCG", "IT"],
  "sentiment": "neutral",
  "confidence": "medium",
  "suggested_action": "Monitor banking sector for policy impact"
}
```

---

### AGENT 3: Sector Agent (agents/sector-agent.js)

**Purpose**: Identify sector rotation — which sectors gaining/losing attention

**Input Data**:
```
- All 9 sector performance changes
- Nifty overall change
```

**Agent Prompt**:
```
"You are a sector rotation analyst.
Sectors:
- IT: +2.6%
- Banking: -0.62%
- Auto: -0.4%
- FMCG: +0.8%
- ... (all 9 sectors)

Identify top 3 sectors (strongest/weakest).
With exact percentages. Respond with JSON..."
```

**Output JSON**:
```json
{
  "title": "IT leads, Banking retreats",
  "top_sector": "IT",
  "top_sector_reason": "IT Index up 2.6% with strong tech demand",
  "second_sector": "FMCG",
  "second_sector_reason": "FMCG up 0.8% showing defensive strength",
  "weak_sector": "Banking",
  "weak_sector_reason": "Banking down 0.62% amid rate cut expectations",
  "rotation_signal": "Capital flowing from banking to IT and FMCG",
  "confidence": "high",
  "suggested_action": "Sector rotation towards defensive + growth"
}
```

---

### AGENT 4: Opportunity Agent (agents/opportunity-agent.js)

**Purpose**: Find ONE best investment opportunity RIGHT NOW

**Input Data**:
- Market data + sector movements
- User portfolio context (if exists)

**Agent Prompt**:
```
"You are opportunity specialist for Indian markets.

Current best opportunity: identify ONE specific Indian ETF.
Examples: Nifty 50 Index ETF, Bank Nifty ETF, ICICI Prudential 
IT ETF, Kotak Gold ETF...

With real numbers explaining why. Respond with JSON:
{ title, asset, reason, confidence, time_horizon, 
  suggested_action }"
```

**Output JSON**:
```json
{
  "title": "IT sector showing momentum",
  "asset": "ICICI Prudential IT ETF",
  "reason": "IT Index up 2.6% vs market 0.2%. Tech demand strong...",
  "confidence": "medium",
  "time_horizon": "medium-term (weeks)",
  "suggested_action": "IT sector showing strength. Can be monitored"
}
```

---

### AGENT 5: Risk Agent (agents/risk-agent.js)

**Purpose**: Identify risk signals and warn investors

**Input Data**:
- Market volatility
- Sector weakness
- Overall market health

**Agent Prompt**:
```
"You are a risk management specialist.

Today's data shows:
- Nifty down 0.5%
- Banking down 0.62%
- Volatility: moderate

Identify the most important RISK signal. If stable, say so.
Never manufacture risks. Respond with JSON..."
```

**Output JSON**:
```json
{
  "title": "Banking sector weakness persists",
  "risk_area": "Banking sector",
  "reason": "Banking down 0.62%. Rate cut fears persist. Monitor...",
  "severity": "low",
  "confidence": "high",
  "suggested_action": "Monitor banking exposure. Consider diversification"
}
```

---

### AGENT 6: Decision Engine (agents/decision-engine.js)

**Purpose**: Synthesize all 5 agents into ONE coherent strategy

**Input**: Results from Market, News, Sector, Opportunity, Risk agents + Portfolio data

**Logic Flow**:
```javascript
buildFinalDecision({
  market: {...},
  news: {...},
  sector: {...},
  opportunity: {...},
  risk: {...},
  portfolio: { IT: 45, Banking: 20 } // user's sector exposure
})
```

**Key Logic**:
1. **Detect beginner vs investor**: Is portfolio empty?
2. **Extract signals**:
   - `topSector` = sector?.top_sector
   - `macroSentiment` = news?.sentiment (bullish/bearish/neutral)
   - `riskSeverity` = risk?.severity
   - `userExposure` = portfolio[topSector]
3. **Build decision rules**:
   ```javascript
   if (userExposure > 40) {
     action = "hold"; // Prevent overconcentration
   } else if (strongSector && bullishNews && lowRisk) {
     action = "buy"; // All signals aligned
   } else if (highRisk) {
     action = "observe"; // Preserve capital
   }
   ```
4. **Generate "WHY" explanation**: Explain each decision component

**Output JSON**:
```json
{
  "status": "optimistic",
  "insight": "IT sector showing steady momentum...",
  "impact_on_user": "You hold 45% IT. Monitor for overconcentration.",
  "action": "Holding current positions is advised...",
  "action_type": "hold",
  "urgency": "low",
  "confidence": "high",
  "next_step": "Maintain exact current positioning...",
  "beginner": false,
  "personalized": true,
  "why": {
    "market_summary": "...",
    "sector_analysis": "...",
    "news_impact": "...",
    "risk_analysis": "...",
    "portfolio_impact": "..."
  }
}
```

---

### AGENT 7: Personalization Engine (agents/personalization-engine.js)

**Purpose**: Adapt decision based on user profile

**Input**:
- Final decision from decision engine
- User profile (risk_tolerance, investment_goal)

**Logic**:
```javascript
export function personalizeDecision(finalDecision, userProfile) {
  // Extract user preferences
  const goal = userProfile.investment_goal // long-term vs short-term
  const riskTolerance = userProfile.risk_tolerance // conservative vs aggressive
  
  // Adapt based on profile
  if (goal === 'long-term-growth') {
    insight += "This aligns with your long-term accumulation plans."
  }
  
  if (riskTolerance === 'conservative' && action === 'buy') {
    action = "Focus on capital preservation first..."
  }
  
  return { ...finalDecision, personalized: true }
}
```

**Example Transformation**:
- **Original**: "Consider 60% IT, 40% banking"
- **For Conservative User**: "Consider small IT allocation (20%), keep 80% in stable banking"

---

### AGENT 8: Portfolio Exposure Engine (agents/portfolio-exposure-engine.js)

**Purpose**: Prevent over-concentration in single sector

**Input**:
- Personalized decision
- User's current holdings
- Top momentum sector

**Logic**:
```javascript
export function applyPortfolioContext(decision, portfolio, topSector) {
  const currentExposure = portfolio[topSector] || 0
  
  if (currentExposure > 50) {
    // User already overexposed
    decision.action = "Holding is better than adding..."
    decision.urgency = "low"
  }
  
  return decision
}
```

---

## DECISION ENGINE LOGIC

### How the Final Decision is Built

```javascript
// Algorithm: Synthesize 5 agents into decision
function buildFinalDecision({ market, news, sector, opportunity, risk, portfolio }) {
  
  // Step 1: Extract signals
  const topSector = sector.top_sector; // e.g., "IT"
  const sentiment = news.sentiment; // "bullish", "bearish", "neutral"
  const riskLevel = risk.severity; // "high", "medium", "low"
  
  // Step 2: Detect user type
  const isBeginnerUser = Object.keys(portfolio).length === 0;
  
  // Step 3: Check user exposure to top sector
  const existingExposure = portfolio[topSector] || 0; // e.g., 45%
  
  // Step 4: Build logic tree
  let action = "observe";
  
  if (isBeginnerUser) {
    // Beginners: Conservative
    action = "Start with broad index ETF";
    urgency = "low";
    confidence = "medium";
  }
  else if (existingExposure > 40) {
    // Already concentrated
    action = "Hold to avoid overconcentration";
    urgency = "low";
    confidence = "high";
  }
  else if (sentiment === "bullish" && topSectorPercent > 0.5 && riskLevel === "low") {
    // All signals aligned: bullish, sector strong, risks low
    action = "Gradual allocation can be considered";
    urgency = "low";
    confidence = "medium";
  }
  else if (riskLevel === "high") {
    // Protect capital
    action = "Observe and preserve capital";
    urgency = "low";
    confidence = "high";
  }
  
  // Step 5: Generate status
  let status = "neutral";
  if (riskLevel === "high" || sentiment === "bearish") {
    status = "cautious";
  } else if (sentiment === "bullish") {
    status = "optimistic";
  }
  
  // Step 6: Build impact summary
  let portfolioImpact = "Your profile shows...";
  if (existingExposure > 40) {
    portfolioImpact = `You have high ${topSector} exposure (${existingExposure}%). Overconcentration increases risk.`;
  }
  
  // Step 7: Generate "why" section
  const why = {
    market_summary: market.summary,
    sector_analysis: sector.rotation_signal,
    news_impact: `Macro sentiment: ${sentiment}`,
    risk_analysis: risk.reason,
    portfolio_impact: portfolioImpact
  };
  
  return {
    status,
    insight, // main narrative
    impact_on_user,
    action, // recommendation
    action_type, // hold|buy|observe
    urgency,
    confidence,
    next_step,
    why
  };
}
```

---

## API ENDPOINTS — COMPLETE REFERENCE

### 1. GET /api/run-all
**Purpose**: Execute all agents and generate insights

**Flow**:
```
1. Get user session & ID
2. Fetch user's holdings
3. Calculate portfolio sector exposure
4. Run 5 agents in parallel
5. Synthesize decision
6. Personalize based on profile
7. Store all in Supabase
8. Return JSON with all results
```

**Request**:
```
GET /api/run-all
Cookie: session_cookie
```

**Response**:
```json
{
  "success": true,
  "results": {
    "market": { agent output },
    "news": { agent output },
    "sector": { agent output },
    "opportunity": { agent output },
    "risk": { agent output }
  },
  "finalDecision": { 
    decision engine output + personalization
  },
  "timestamp": "2024-01-15T09:30:00Z"
}
```

---

### 2. GET /api/insights
**Purpose**: Fetch latest insights for dashboard

**Logic**:
```
1. Query insights table
2. Get latest run_id
3. Filter all insights by that run_id
4. Return unique insights (1 per type: market, news, sector, etc.)
```

**Request**:
```
GET /api/insights
```

**Response**:
```json
{
  "success": true,
  "data": [
    { "type": "market", "title": "...", ... },
    { "type": "news", "title": "...", ... },
    { "type": "sector", "title": "...", ... },
    { "type": "opportunity", "title": "...", ... },
    { "type": "risk", "title": "...", ... },
    { "type": "decision", "title": "...", raw_data: {...} }
  ]
}
```

---

### 3. POST /api/chat
**Purpose**: AI chat answering user questions

**Flow**:
```
1. Receive user message
2. Build system prompt with:
   - Current market context (from /api/insights)
   - User portfolio data
   - Final decision logic
   - Strict rules (no stock picking)
3. Call Gemini
4. Return response
```

**Request**:
```json
{
  "message": "Should I buy IT stocks?",
  "context": {
    "market": {...},
    "sector": {...},
    "risk": {...},
    "finalDecision": {...}
  }
}
```

**Response**:
```json
{
  "success": true,
  "reply": "IT sector is showing strength at 2.6% up... However, consider your existing IT exposure and risk tolerance before adding..."
}
```

---

### 4. GET /api/market-data
**Purpose**: Fetch live market prices

**Returns**:
```json
{
  "nifty": {
    "price": 22800,
    "change": 45.60,
    "changePercent": 0.21,
    "volume": 125000000
  },
  "sectors": [
    { "name": "IT", "changePercent": 2.6 },
    { "name": "Banking", "changePercent": -0.62 },
    ...
  ]
}
```

---

### 5. GET /api/agents/market
**Purpose**: Run just market agent

**Returns**: Same as runMarketAgent output

---

### Similar Endpoints
- `GET /api/agents/news` → Run news agent
- `GET /api/agents/sector` → Run sector agent
- `GET /api/agents/opportunity` → Run opportunity agent
- `GET /api/agents/risk` → Run risk agent

---

## FRONTEND COMPONENTS & FLOW

### Main Dashboard Flow (app/page.js)

```
1. USER OPENS DASHBOARD
   └─ useEffect fires
   
2. LOAD INSIGHTS
   ├─ GET /api/insights
   ├─ Extract latest run insights
   ├─ Parse all agent outputs
   
3. SET UP REAL-TIME LISTENER
   ├─ supabase.channel('insights-realtime')
   ├─ Listen for INSERT on insights table
   ├─ Auto-reload on new insight
   
4. INTERCEPT FETCH REQUESTS
   ├─ Detect /api/run-all call
   ├─ Auto-reload insights after
   
5. CLOCK & GREETING
   ├─ Display IST time
   ├─ Update every second
   ├─ Show "Good morning" / "afternoon" / "evening"
   
6. RENDER SECTIONS
   ├─ Portfolio Input (add holdings)
   ├─ Main Decision Card (largest section)
   │  ├─ Status badge
   │  ├─ Main insight
   │  ├─ Portfolio impact
   │  ├─ Action recommendation
   │  ├─ Next step
   │  └─ "WHY?" button
   ├─ Hidden WhySection (revealed on WHY click)
   ├─ Chatbot (floating button)
```

### Component Tree
```
Home (app/page.js)
├─ PortfolioInput
│  └─ Add/view holdings
├─ AIInsightHero
│  └─ Main decision card
├─ MarketSnapshot (inside why section)
│  └─ Live prices
├─ MarketBriefSection (inside why section)
│  └─ Historical insights
├─ OpportunityRadar (inside why section)
│  └─ Opportunities
├─ RiskAlerts (inside why section)
│  └─ Risk warnings
└─ Chatbot
   └─ Chat interface
```

### Key Component Props Flow
```
Home
├─ results = {
     market: insights.find(i => i.type === 'market').raw_data,
     sector: insights.find(i => i.type === 'sector').raw_data,
     ...
   }
├─ Pass results → Chatbot
├─ Pass results → WhySection
│  ├─ Pass to MarketSnapshot
│  ├─ Pass to MarketBriefSection
│  └─ Pass to RiskAlerts
```

---

## CORE UTILITIES & LIBRARIES

### lib/gemini.js — LLM Wrapper
```javascript
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function callGemini(prompt) {
  // Uses Groq client (via llama-3.3-70b model)
  // Falls back to 8b model if rate limited
  
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7, // balanced creativity
      max_tokens: 1024
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    if (error.status === 429) { // Rate limited
      // Retry with smaller model
      const retry = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        ...
      });
      return retry.choices[0].message.content;
    }
    throw error;
  }
}
```

**Why Groq Instead of Google Gemini?**
- Faster inference
- Lower latency
- Better rate limiting handling
- Better for real-time agent execution

---

### lib/data-fetcher.js — Market Data Aggregator
```javascript
export async function fetchNiftyData() {
  // Try Yahoo Finance first
  try {
    const quote = await yahooFinance.quote('^NSEI');
    return {
      price: quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent
    };
  } catch {
    // Fall back to static data
    return { price: 22800, changePercent: 0.2 };
  }
}

export async function fetchTopSectors() {
  // Fetch all 9 sectors
  const symbols = [
    { symbol: '^NSEBANK', name: 'Banking' },
    { symbol: '^CNXIT', name: 'IT' },
    // ... 7 more
  ];
  
  // Try Yahoo, then Alpha Vantage, then fallback
  for (each symbol) {
    try Yahoo;
    catch try AlphaVantage;
    catch use staticData;
  }
  
  return results;
}
```

**Fallback Strategy**: 
- Primary: Yahoo Finance
- Secondary: Alpha Vantage
- Tertiary: Static mock data

---

### lib/user-context.js — Personalization Context
```javascript
export async function getUserContext(userId) {
  if (!userId) return '';
  
  // Fetch profile
  const profile = await supabase
    .from('profiles')
    .select('full_name, risk_tolerance, investment_goal, experience_level')
    .eq('id', userId)
    .single();
  
  // Fetch holdings
  const holdings = await supabase
    .from('holdings')
    .select('name, symbol, quantity')
    .eq('user_id', userId);
  
  // Build text block
  const holdingsSummary = holdings.map(h => 
    `${h.name} (${h.symbol}): ${h.quantity} units`
  ).join(', ');
  
  return `
PERSONALISATION CONTEXT — IMPORTANT:
Investor: ${profile.full_name}
Risk Tolerance: ${profile.risk_tolerance}
Investment Goal: ${profile.investment_goal}
Experience Level: ${profile.experience_level}
Current Holdings: ${holdingsSummary}`;
}
```

**Used By**: Every agent to inject user context into prompts

---

### lib/supabase.js — Database Client
```javascript
export const supabase = 
  typeof window !== 'undefined'
    ? createBrowserClient(...) // Client-side
    : createClient(..., {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      }); // Server-side
```

**Handles**: 
- Auto auth refresh
- Session persistence
- Both browser & server execution

---

## COMPLETE CODE WALKTHROUGHS

### Walkthrough 1: User Clicks "Run AI Analysis"

```
STEP 1: Frontend Triggers
─────────────────────────
// app/layout.js
async function runAnalysis() {
  // Show step-by-step UI updates
  setRunStatus('Collecting market data...');
  
  // Make request
  const response = await fetch('/api/run-all');
  const data = await response.json();
  
  // After success, reload insights
  window.location.reload();
}

STEP 2: Backend Receives Request
────────────────────────────────
// app/api/run-all/route.js
export async function GET(request) {
  // 1. Auth check
  const session = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  // 2. Build portfolio
  const holdings = await supabase
    .from('holdings')
    .select('symbol, quantity')
    .eq('user_id', userId);
  
  // 3. Map to sectors
  const portfolio = {};
  for (const h of holdings) {
    const sector = stockToSector[h.symbol]; // INFY→IT
    portfolio[sector] += quantity * price;
  }
  portfolio[sector] = (portfolio[sector] / total) * 100; // Convert to %
  
  // 4. Run agents
  const [market, news, sector, opportunity, risk] = 
    await Promise.allSettled([
      runMarketAgent(userId, runId),
      runNewsAgent(userId, runId),
      runSectorAgent(userId, runId),
      runOpportunityAgent(userId, runId),
      runRiskAgent(userId, runId)
    ]);
  
  // 5. Decision engine
  const finalDecision = buildFinalDecision({
    market, news, sector, opportunity, risk, portfolio
  });
  
  // 6. Personalize
  const personalized = personalizeDecision(finalDecision, userProfile);
  
  // 7. Store decision
  await supabase.from('insights').insert({
    type: 'decision',
    title: 'Market Assessment Framework',
    raw_data: personalized
  });
  
  // 8. Return
  return NextResponse.json({
    success: true,
    finalDecision: personalized,
    timestamp: new Date().toISOString()
  });
}

STEP 3: Dashboard Reloads Insights
──────────────────────────────────
// app/page.js
useEffect(() => {
  loadInsights(); // Auto-reload after API call
}, []);

STEP 4: Display to User
──────────────────────
Renders AIInsightHero card with:
- Status badge
- Main insight
- Portfolio impact
- Action
- Next step
```

---

### Walkthrough 2: User Asks Chatbot "Should I buy IT stocks?"

```
STEP 1: User Types in Chatbot
──────────────────────────────
// components/dashboard/Chatbot.js
const handleSend = async (e) => {
  setMessages([...messages, { role: 'user', content: userMessage }]);
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: "Should I buy IT stocks?",
      context: {
        market: market_data,
        sector: sector_data,
        risk: risk_data,
        finalDecision: decision_data
      }
    })
  });
};

STEP 2: API Builds Prompt
─────────────────────────
// app/api/chat/route.js
const systemPrompt = `You are a financial assistant.

STRICT RULES:
- NO stock picking
- NO "best stocks"
- Respect finalDecision: if action_type='hold', explain why holding is better
- Reference context data
- Beginner mode: guide learning
- Investor mode: mention exposure & balance

CONTEXT:
Market: ${JSON.stringify(market)}
Sector: ${JSON.stringify(sector)}
Risk: ${JSON.stringify(risk)}
Final Decision: ${JSON.stringify(finalDecision)}
User Portfolio: ${JSON.stringify(portfolio)}

User Question: "Should I buy IT stocks?"`;

STEP 3: LLM Responds
────────────────────
const response = await callGemini(systemPrompt);
// Possible response:
// "IT sector is showing strength at +2.6%. However, you already hold 
// 45% IT which is near concentration levels. The decision engine 
// recommends holding current positions rather than adding. Consider 
// diversifying into other strong sectors like FMCG before increasing IT."

STEP 4: Display in Chat
───────────────────────
setMessages([...messages, 
  { role: 'assistant', content: response }
]);
```

---

### Walkthrough 3: Agent Execution — Market Agent Detail

```
STEP 1: Market Agent Called
────────────────────────────
// agents/market-agent.js
export async function runMarketAgent(userId, runId) {

STEP 2: Fetch Market Data
──────────────────────────
const data = await getMarketData();
// Returns:
{
  nifty: { price: 22800, changePercent: 0.21, ... },
  sectors: [
    { name: 'IT', changePercent: 2.6 },
    { name: 'Banking', changePercent: -0.62 },
    // ... 7 more
  ]
}

STEP 3: Get User Context
────────────────────────
const userContext = await getUserContext(userId);
// Returns:
`PERSONALISATION CONTEXT:
Investor: Amit Kumar
Risk Tolerance: moderate
Investment Goal: long-term-growth
Experience Level: beginner
Current Holdings: None`

STEP 4: Build Prompt
────────────────────
const prompt = `You are a senior financial analyst.

Today's data:
- Nifty 50: ₹22,800 (+0.21%)
- Sectors: IT +2.6%, Banking -0.62%, ...

Write daily morning brief explaining what this means for a regular 
investor in plain English.

TONE: Calm, not hyped. Use "can be monitored" not "buy now"

Respond ONLY with valid JSON:
{
  "title": "punchy headline (max 8 words)",
  "summary": "2 sentences explaining today's key theme",
  "strong_sectors": ["sector1", "sector2"],
  "weak_sectors": ["sector1"],
  "key_signal": "single most important thing investor should know",
  "confidence": "high|medium|low",
  "suggested_action": "plain English action"
}

PERSONALISATION CONTEXT:
Investor: Amit Kumar
Risk Tolerance: moderate
...
`;

STEP 5: Call LLM
────────────────
const rawResponse = await callGemini(prompt);
// Returns raw JSON string (possibly with ```json fences)

STEP 6: Parse Response
──────────────────────
let parsed = JSON.parse(rawResponse);
// Could fail if response has markdown fences, so need to strip first

STEP 7: Store in Database
──────────────────────────
await supabase.from('insights').insert({
  type: 'market',
  title: parsed.title,
  reason: parsed.summary,
  confidence: parsed.confidence,
  suggested_action: parsed.suggested_action,
  run_id: runId, // Groups all agents from this run
  raw_data: {
    niftyData,
    sectors,
    strong_sectors: parsed.strong_sectors,
    weak_sectors: parsed.weak_sectors,
  }
});

STEP 8: Return Result
─────────────────────
return { ...parsed, supabaseInsertResult };
// Used by decision engine
```

---

## COMPLETE REQUEST LIFECYCLE

### "Run AI Analysis" Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "Run AI Analysis" Button                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend Shows: "Collecting market data..."             │
│    Make HTTP Request: GET /api/run-all                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend /api/run-all/route.js                           │
│    ├─ Extract userId from session                          │
│    ├─ Fetch user holdings from DB                          │
│    └─ Calculate portfolio sector exposure                  │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Market      │  │ News        │  │ Sector      │
│ Agent       │  │ Agent       │  │ Agent       │
│ (Parallel)  │  │ (Parallel)  │  │ (Parallel)  │
└────┬────────┘  └────┬────────┘  └────┬────────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
    ┌─────────────────┼──────────────────┐
    │                 │                  │
    ▼                 ▼                  ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Opportunity │  │ Risk         │  │ Call Gemini  │
│ Agent       │  │ Agent        │  │ for Each     │
│ (Parallel)  │  │ (Parallel)   │  │              │
└────┬────────┘  └────┬─────────┘  └────┬─────────┘
     │                │                  │
     └────────────────┼──────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ All 5 Agents Complete       │
        │ [market, news, sector,      │
        │  opportunity, risk]         │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Decision Engine             │
        │ Synthesize all 5 agents     │
        │ + Portfolio context         │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Personalization Engine      │
        │ Apply user profile          │
        │ (risk_tolerance, goals)     │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Portfolio Exposure Engine   │
        │ Check overconcentration     │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Store All Insights in DB    │
        │ - Market insight            │
        │ - News insight              │
        │ - Sector insight            │
        │ - Opportunity insight       │
        │ - Risk insight              │
        │ - Final Decision            │
        │ (all grouped by run_id)     │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Return JSON Response        │
        │ {                           │
        │   success: true,            │
        │   results: {                │
        │     market: {...},          │
        │     news: {...},            │
        │     ...                     │
        │   },                        │
        │   finalDecision: {...}      │
        │ }                           │
        └────────────┬────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend Receives Response                              │
│    ├─ Reload page (window.location.reload)                │
│    └─ Triggers useEffect to fetch fresh insights          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend Calls GET /api/insights                        │
│    ├─ Get latest run_id                                   │
│    ├─ Fetch all insights with that run_id                 │
│    ├─ Extract unique by type (1 market, 1 news, etc.)    │
│    └─ Render on Dashboard                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Display to User                                        │
│    ┌─────────────────────────────────────────┐             │
│    │ Status: Optimistic                      │             │
│    │                                         │             │
│    │ IT sector showing steady momentum...    │             │
│    │ You hold 45% IT. Monitor for            │             │
│    │ overconcentration.                      │             │
│    │                                         │             │
│    │ ACTION:                                 │             │
│    │ Holding current positions is advised..  │             │
│    │ Maintain diversification.               │             │
│    │                                         │             │
│    │ [WHY?] Button                           │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## KEY CONCEPTS & PATTERNS

### Pattern 1: Agent Execution
Every agent is independently callable and follows same pattern.
Agents can be run in **parallel** for speed.

### Pattern 2: Run ID Grouping
Each execution generates unique `run_id`.
All insights from that run are grouped by `run_id` in DB.
When fetching, get latest `run_id` and fetch all with that ID.

### Pattern 3: Fallback Data
Every data source has fallback:
- Yahoo Finance → Alpha Vantage → Static Data
- Ensures app never crashes, even if APIs down

### Pattern 4: User Context Injection
User profile is injected into every agent prompt.
LLM tailors responses to user's profile.
Same market data, different insights for conservative vs aggressive user.

### Pattern 4: Decision Layering
1. **Market-level decision**: What should market investors do?
2. **Portfolio-level decision**: Given user's existing holdings?
3. **Profile-level decision**: Given user's risk tolerance?
4. **Action-level decision**: What specific action right now?

### Pattern 5: Tone Control
Every agent has strict tone constraints:
- "can be monitored" not "buy now"
- "may present opportunity" not "don't miss"
- Prevents aggressive sales language

---

## DEBUGGING COMMON ISSUES

### Issue 1: Dashboard Not Loading Insights
**Symptom**: Dashboard shows "Synthesizing Intelligence..." forever

**Root Cause**: 
- useEffect not firing on mount
- OR /api/insights returning empty array
- OR insights table empty in DB

**Debug**:
```javascript
// In app/page.js useEffect
console.log('loadInsights called');
const res = await fetch('/api/insights');
console.log('Response:', await res.json()); // Check if data exists
```

### Issue 2: Duplicate Insights
**Symptom**: Same insight appears 2x after running

**Root Cause**: 
- Run ID not unique
- OR database insert doesn't use run_id correctly
- OR real-time listener re-triggers load

**Fix**:
```javascript
// Ensure unique run_id
const runId = uuidv4(); // Must be unique per run
// Delete old run's insights before inserting new
await supabase.from('insights')
  .delete()
  .neq('run_id', runId); // Delete all except current run
```

### Issue 3: LLM Response Not Valid JSON
**Symptom**: 
```
Error: Unexpected token '{' in JSON at position 3
```

**Root Cause**: 
Response has ```json markdown fences

**Fix**:
```javascript
let parsed = JSON.parse(rawResponse);
// Fails if response is:
// ```json
// { ... }
// ```

// Should strip first:
const cleaned = rawResponse
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '');
const parsed = JSON.parse(cleaned);
```

---

## ENVIRONMENT VARIABLES (.env file)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...

# Groq API
GROQ_API_KEY=gsk_xxx...

# Alpha Vantage (optional backup)
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=xxx
```

---

## THIS IS THE COMPLETE PROJECT

You now know:
✅ Architecture & data flow
✅ All 8 agents & their logic
✅ Database schema
✅ API endpoints
✅ Frontend components
✅ Complete code walkthroughs
✅ How insights are generated
✅ How personalization works
✅ How decision engine synthesizes
✅ Common issues & fixes

**Next Steps to Develop**:
1. Fix dashboard loading bug (useEffect dependency)
2. Implement feedback system (thumbs up/down)
3. Build admin dashboard
4. Phase 3: Cron jobs for automatic daily runs
5. Phase 3: Agent memory system
