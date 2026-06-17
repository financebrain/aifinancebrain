# AI Financial Brain - Complete Codebase Analysis

**Project Version**: 0.1.0  
**Framework**: Next.js 16.2.1 with React 19.2.4  
**Last Updated**: May 2, 2026  
**Status**: Stable Version

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Root-Level Configuration Files](#root-level-configuration-files)
3. [Library Module (lib/)](#library-module-lib)
4. [Agents System (agents/)](#agents-system-agents)
5. [Application Pages & Routes (app/)](#application-pages--routes-app)
6. [React Components (components/)](#react-components-components)
7. [Engine Modules (engines/)](#engine-modules-engines)
8. [Scripts & QA Testing (scripts/)](#scripts--qa-testing-scripts)
9. [Public Assets (public/)](#public-assets-public)
10. [Architecture Overview](#architecture-overview)
11. [Data Flow & API Communication](#data-flow--api-communication)

---

## PROJECT OVERVIEW

**AI Financial Brain** is an intelligent investment advisory platform tailored for Indian retail investors. It provides:

- **Real-time market analysis** using live NSE/BSE data
- **Multi-agent AI system** that analyzes market, news, sectors, opportunities, and risks
- **Personalized insights** based on user portfolio and risk tolerance
- **Decision intelligence engine** using quantitative scoring and adaptive weight systems
- **Interactive chatbot** for financial Q&A
- **Portfolio management** with sector exposure tracking
- **User authentication & onboarding** via Supabase

### Key Features
- Live market data from Yahoo Finance and Alpha Vantage APIs
- Multi-agent analysis (Market, News, Sector, Risk, Opportunity agents)
- Gemini/Groq LLM integration for natural language analysis
- Adaptive decision weights based on historical trading patterns
- Portfolio overlap detection and exposure management
- User profile personalization (risk tolerance, investment goals, experience level)
- Real-time feedback collection and learning systems

---

## ROOT-LEVEL CONFIGURATION FILES

### package.json
- **Purpose**: Node.js project configuration and dependency management
- **Key Dependencies**:
  - `@google/generative-ai`: Gemini API for AI analysis
  - `groq-sdk`: Groq LLM provider (fallback from Gemini)
  - `@supabase/supabase-js`: Database and authentication
  - `axios`: HTTP requests
  - `yahoo-finance2`: Market data fetching
  - `date-fns`: Date manipulation
  - `uuid`: Unique ID generation
  - `tailwindcss`: CSS framework
  - `lucide-react`: Icon library
- **Scripts**:
  - `npm run dev`: Start development server
  - `npm run build`: Production build
  - `npm run start`: Run production server
  - `npm run lint`: Run ESLint

### next.config.mjs
- **Purpose**: Next.js configuration
- **Current State**: Minimal configuration with comments for future expansion
- **Notable**: Empty config object suggests defaults are acceptable for current setup

### middleware.js
- **Purpose**: Next.js middleware for authentication and routing
- **Key Functions**:
  - Validates user session via Supabase auth
  - Redirects unauthenticated users to `/login`
  - Enforces onboarding completion before dashboard access
  - Allows public routes (`/login`, `/onboarding`) and all API routes
- **Session Management**: Uses Supabase server client with cookie-based persistence

### jsconfig.json
- **Purpose**: JavaScript path aliases and compiler options
- **Notable Aliases**: Uses `@/` for root import path aliasing

### postcss.config.mjs
- **Purpose**: PostCSS configuration for Tailwind CSS
- **Configuration**: Uses Tailwind v4 preset

### eslint.config.mjs
- **Purpose**: ESLint configuration for code quality
- **Details**: Uses standard ESLint setup for Next.js

### run.js
- **Purpose**: Simple CLI script for testing weight checking
- **Implementation**: Executes `runWeightCheck()` from decision-memory and logs results
- **Used For**: Development-time verification of adaptive weights system

---

## LIBRARY MODULE (lib/)

### gemini.js
- **Purpose**: LLM API wrapper for AI analysis
- **Provider**: Groq (fallback from Gemini) with llama-3.3-70b-versatile model
- **Key Function**: `callGemini(prompt)`
  - Takes text prompt and returns AI-generated response
  - Implements rate-limiting retry logic for 429 errors
  - Falls back to llama-3.1-8b-instant on rate limit
  - Includes 1-second delay between calls
- **Error Handling**: Graceful fallback to smaller model on API rate limits

### data-fetcher.js
- **Purpose**: Fetch stock data from Yahoo Finance
- **Key Functions**:
  - `fetchNiftyData()`: Gets Nifty 50 price, change, change percent, volume
  - `fetchTopSectors()`: Fetches 9 sector indices (Bank Nifty, IT, Auto, FMCG, Pharma, Metal, Energy, Midcap)
- **Error Handling**: Returns estimated data on fetch failure
- **Data Structure**: Returns objects with {price, changePercent} format

### data-provider.js
- **Purpose**: Multi-source data aggregation for market prices
- **Data Sources** (in priority order):
  1. Yahoo Finance string API (primary)
  2. Alpha Vantage API (secondary)
  3. Static mock fallback data (tertiary)
- **Symbols Tracked**: 9 indices (Nifty 50, Bank Nifty, IT, Auto, FMCG, Pharma, Metal, Energy, Midcap)
- **Key Features**:
  - Fallback mechanism if primary source fails
  - Logging of data source used
  - Returns both Nifty and sector data
  - Handles API failures gracefully

### quant-engine.js
- **Purpose**: Quantitative scoring and decision logic for trading/investing
- **Key Functions**:
  - `normalizeInputs()`: Standardizes market inputs (sentiment, sector strength, risk level, exposure)
  - `convertToScores()`: Converts inputs to numerical scores using pattern data
  - `calculateScore()`: Computes weighted score across 4 dimensions:
    - Market sentiment (25% weight default)
    - Sector strength (30% weight default)
    - Risk level (25% weight default)
    - Portfolio exposure (20% weight default)
  - `applyScorePenalties()`: Reduces score for high risk or overexposure
  - `calculateConflictScore()`: Measures disagreement between contributing signals
  - `calculateExecutionPlan()`: Generates trade execution details (stop loss, take profit, position size)
- **Scoring Logic**: 
  - Converts sentiment/sectors to 0-1 scores
  - Applies weighted combinations
  - Penalizes based on risk signals
  - Returns comprehensive result with contributions breakdown

### supabase.js
- **Purpose**: Supabase client initialization
- **Implementation**:
  - Detects client-side vs server-side context
  - Uses browser client in frontend, server client in backend
  - Handles auth token persistence
  - Initializes with URL and anonymous key from environment
- **Error Handling**: Logs warning if credentials missing

### json-utils.js
- **Purpose**: Safe JSON parsing for LLM responses
- **Key Functions**:
  - `cleanAndParseJSON()`: Two-pass JSON parsing with recovery
    - First pass: Basic markdown cleanup
    - Second pass (retry): Aggressive cleaning if first fails
  - `cleanJSONResponse()`: Removes markdown code blocks, normalizes whitespace
  - `validateJSONStructure()`: Validates required fields are present
- **Features**:
  - Handles markdown-wrapped JSON
  - Removes trailing commas and non-printable characters
  - Validates object/array structure
  - Returns null on parse failure with detailed logging

### decision-memory.js
- **Purpose**: Adaptive weight system and historical pattern learning
- **Key Functions**:
  - `adaptWeightsWithStats()`: Adjusts weights based on historical trading performance
  - `normalizePerformanceGroup()`: Groups and calculates average accuracy by category
  - `normalizeWeights()`: Ensures weights sum to 1.0
  - `buildSignalImpact()`: Creates signal strength profiles with recency weighting
  - `getSignalPatterns()`: Retrieves pattern data from database
  - `getDynamicWeights()`: Gets adaptive weights based on recent trades
  - `runWeightCheck()`: Validates and returns current weight configuration
- **Algorithm Details**:
  - Uses recency factor: `1 / (1 + days / 7)` to weight recent trades higher
  - Combines accuracy and win rate for signal strength
  - Clamps weights between 0.1-0.6 for stability
  - Normalizes final weights to sum to 1.0
- **Data Source**: Reads from 'trades' table in Supabase

### news-provider.js
- **Purpose**: Aggregate financial news from multiple sources
- **Data Sources** (in order):
  1. NewsAPI (external API with API key)
  2. Yahoo Finance News (via yahoo-finance2)
  3. Static fallback data (hardcoded news items)
- **Key Functions**:
  - `getNewsData()`: Fetches and processes news articles
  - Sentiment analysis with bullish/bearish keywords
  - Relevance filtering (keeps India-focused content)
  - Deduplication by title
- **Output Structure**: 
  ```javascript
  {
    title: string,
    summary: string (publisher or description),
    source: string,
    sentiment: 'bullish' | 'bearish' | 'neutral'
  }
  ```

### trade-journal.js
- **Purpose**: Record and analyze trading history for learning
- **Key Functions**:
  - `createTradeRecord()`: Insert new trade into database or local storage
  - `getTradeById()`: Retrieve specific trade by ID
  - `updateTradeById()`: Update trade status/outcome
  - `recordLearning()`: Log learning data (win rate, adjustments)
  - `getTradeStats()`: Aggregate statistics by category (sector, market sentiment, risk level)
- **Storage**: Uses Supabase `trades` and `learning_data` tables (falls back to local store)
- **Statistics Calculated**:
  - Total trades, wins, losses, win rate
  - Breakdown by sector, market sentiment, risk level
  - Individual win rates per category

### system.js
- **Purpose**: Main system controller for selecting execution mode
- **Key Function**: `runSystem(input, mode)`
  - Routes to investing engine for 'investing' mode
  - Routes to trading engine for 'trading' mode
  - Throws error for unknown modes
- **Usage**: Central dispatch for dual-mode platform

### user-context.js
- **Purpose**: Fetch and format user profile context for AI agents
- **Key Function**: `getUserContext(userId)`
  - Retrieves user profile (name, risk tolerance, investment goal, experience level)
  - Fetches current holdings (stocks, symbols, quantities)
  - Formats context string with personalization guidance
  - Returns empty string if user not found
- **Context Template**: Includes investor profile, holdings summary, and tone guidance for AI
- **Error Handling**: Catches database errors, logs to console, returns empty string

---

## AGENTS SYSTEM (agents/)

The agents system provides specialized analysis across different market dimensions. Each agent:
1. Fetches market/news data
2. Builds a Gemini prompt with user context
3. Calls LLM for analysis
4. Parses JSON response
5. Stores result in Supabase `insights` table
6. Returns structured insight

### market-agent.js
- **Purpose**: Daily market sentiment and trend analysis
- **Output Structure**:
  ```javascript
  {
    title: string (max 8 words),
    summary: string (2 sentences with actual numbers),
    strong_sectors: array,
    weak_sectors: array,
    key_signal: string (single most important insight),
    confidence: 'high' | 'medium' | 'low',
    suggested_action: string
  }
  ```
- **Data Used**: Nifty price, sector movements
- **Tone Constraints**: Calm advisory tone, avoids "strong buy" language
- **Storage**: Stores in `insights` table with type='market'
- **Rate Limiting**: Includes 4-second delay to prevent API throttling

### risk-agent.js
- **Purpose**: Identify current market risks and protective measures
- **Output Structure**:
  ```javascript
  {
    title: string (risk headline, <8 words),
    risk_area: string (sector or market area),
    reason: string (2 sentences with real numbers),
    severity: 'high' | 'medium' | 'low',
    confidence: 'high' | 'medium' | 'low',
    suggested_action: string (protective action)
  }
  ```
- **Analysis**: Evaluates Nifty movement, sector volatility
- **Risk Assessment**: Determines severity based on market data
- **Storage**: Stores in `insights` table with type='risk'

### news-agent.js
- **Purpose**: Synthesize financial headlines into market signals
- **Output Structure**:
  ```javascript
  {
    title: string (key theme, <10 words),
    summary: string (2-sentence analysis),
    impacted_sectors: array,
    sentiment: 'bullish' | 'bearish' | 'neutral',
    confidence: 'high' | 'medium' | 'low',
    suggested_action: string
  }
  ```
- **Input**: News items with embedded sentiment from news-provider
- **Processing**: Extracts key themes from headlines
- **Storage**: Stores in `insights` table with type='news'

### sector-agent.js
- **Purpose**: Sector rotation analysis and capital flow detection
- **Output Structure**:
  ```javascript
  {
    title: string (sector theme, 4-6 words),
    top_sector: string,
    top_sector_reason: string (with exact percentage),
    second_sector: string,
    second_sector_reason: string,
    weak_sector: string,
    weak_sector_reason: string,
    rotation_signal: string (where money is moving),
    confidence: 'high' | 'medium' | 'low',
    suggested_action: string (observational, not instructional)
  }
  ```
- **Data Used**: All 9 sector indices
- **Tone Constraints**: Strictly observational, no "invest in" language
- **Storage**: Stores in `insights` table with type='sector'

### opportunity-agent.js
- **Purpose**: Detect high-probability investment opportunities
- **Output Structure**:
  ```javascript
  {
    title: string (opportunity headline, max 8 words),
    asset: string (specific Indian ETF or index name),
    reason: string (2 sentences with real numbers),
    confidence: 'high' | 'medium' | 'low',
    time_horizon: 'short-term (days)' | 'medium-term (weeks)',
    suggested_action: string
  }
  ```
- **Focus**: Real, tradeable assets (Nifty 50 ETF, Bank Nifty ETF, IT ETF, Gold ETF, etc.)
- **Constraints**: Safe language, no aggressive sell tactics
- **Storage**: Stores in `insights` table with type='opportunity'

### decision-engine.js
- **Purpose**: Synthesize all agent outputs into unified investment decision
- **Key Function**: `buildFinalDecision()`
  - Inputs: market, news, sector, opportunity, risk, portfolio, weights
  - Extracts sentiment, risk level, sector strength from agent outputs
  - Calculates weighted quantitative score via quant-engine
  - Generates descriptive action and confidence
  - Builds "why" explanation across all dimensions
- **Output Structure**:
  ```javascript
  {
    status: 'cautious' | 'neutral' | 'optimistic',
    insight: string (narrative explaining market situation),
    impact_on_user: string (portfolio-specific impact),
    action: string (descriptive action),
    action_type: 'buy' | 'hold' | 'observe',
    urgency: 'high' | 'medium' | 'low',
    next_step: string,
    confidence: 'high' | 'medium' | 'low',
    beginner: boolean,
    personalized: boolean,
    why: {
      market_summary: string,
      sector_analysis: string,
      news_impact: string,
      risk_analysis: string,
      portfolio_impact: string
    },
    scoring: {
      score: number,
      action: string,
      confidence: string,
      contributions: object
    }
  }
  ```
- **Score Mapping**:
  - score < -0.3 → status='cautious'
  - score > 0.3 → status='optimistic'
  - else → status='neutral'

### personalization-engine.js
- **Purpose**: Tailor decision output to individual investor profile
- **Key Function**: `personalizeDecision(finalDecision, userProfile)`
  - Checks user's investment goal (long-term-growth, short-term-profit, wealth-preservation, learning)
  - Checks user's risk tolerance (conservative, moderate, aggressive)
  - Modifies insights and actions accordingly
  - For conservative investors: emphasizes capital preservation
  - For aggressive investors: highlights growth opportunities
- **Output**: Modified decision object with personalized messaging

### portfolio-exposure-engine.js
- **Purpose**: Enforce portfolio concentration limits
- **Key Function**: `applyPortfolioContext(personalizedDecision, portfolios, topSector)`
  - Calculates sector exposure percentage
  - Enforces maximum 40% exposure per sector
  - Overrides action to "hold" if overexposed
  - Returns unmodified decision if exposure acceptable
- **Exposure Logic**:
  - Matches portfolio holdings to top sector
  - Handles sector name variations (e.g., "IT" vs "Information Technology")
  - Adds portfolio_adjusted flag when override applied

---

## APPLICATION PAGES & ROUTES (app/)

### Root Layout & Styling

#### layout.js
- **Purpose**: Root layout wrapper for entire application
- **Features**:
  - Initializes auth state and user profile
  - Provides top navigation with logo and links
  - Implements "Run AI Analysis" button triggering all agents
  - Shows real-time run status (Collecting data → Done)
  - Manages logout functionality
  - Responsive layout with mobile/desktop nav variants
- **Navigation Links**: Dashboard, Portfolio, Market Brief, Admin, Login
- **Styling**: Dark blue (#1B2A4A) theme with Tailwind CSS

#### globals.css
- **Purpose**: Global Tailwind CSS styles
- **Content**: Standard Next.js + Tailwind configuration
- **Customizations**: Dark blue primary color for brand consistency

### Pages

#### page.js (Dashboard)
- **Purpose**: Main dashboard showing all AI insights
- **Key Components**:
  - AIInsightHero: Featured market insight
  - MarketSnapshot: Live price tickers
  - OpportunityRadar: Investment opportunities
  - RiskAlerts: Current risk warnings
  - InsightFeed: Detailed insight cards
  - MarketBriefSection: Historical analysis
  - PortfolioCard: Holdings summary
  - Chatbot: Q&A assistant
  - PortfolioInput: Add new holdings
- **Real-time Updates**: Subscribes to Supabase insights channel
- **Clock**: Shows IST time and dynamic greeting (morning/afternoon/evening)
- **Auto-reload**: Intercepts fetch calls to reload insights after /api/run-all

#### admin/page.js
- **Purpose**: Admin dashboard with system metrics
- **Metrics Displayed**:
  - Total insights generated
  - Total feedback collected
  - Helpfulness rate
  - Insights today
  - Breakdown by insight type (market, news, sector, opportunity, risk)
- **Features**:
  - Clear old insights (>48hrs old, keeps latest 20)
  - Feedback list with ratings
  - Real-time data loading
- **Access**: Requires authentication via middleware

#### login/page.js
- **Purpose**: User authentication (signup/signin)
- **Features**:
  - Email/password form with validation
  - Toggle between sign-up and sign-in modes
  - Show/hide password toggle
  - Error message display
  - Redirects to onboarding after signup, dashboard after signin
- **Error Handling**: Displays error messages from Supabase auth

#### onboarding/page.js
- **Purpose**: Multi-step user profile setup
- **Questions** (3 steps):
  1. Risk Tolerance: conservative, moderate, aggressive
  2. Investment Goal: long-term-growth, regular-income, wealth-preservation, learning
  3. Experience Level: beginner, some, experienced
- **Features**:
  - Auto-advance between steps
  - Emoji-enhanced options
  - Saves to Supabase profiles table
  - Redirects to dashboard on completion
- **Storage**: Saves answers as risk_tolerance, investment_goal, experience_level

#### portfolio/page.js
- **Purpose**: Portfolio management interface
- **Features**:
  - View all holdings
  - Add new holdings (name, symbol, quantity, avg_buy_price, asset_type)
  - Delete individual holdings
  - Calculate total invested
  - Asset types: Stock, ETF, Mutual Fund, Gold, Other
  - Real-time Supabase synchronization
- **Storage**: Stores in `holdings` table with user_id

#### assistant/page.js
- **Purpose**: AI financial assistant chat interface
- **Features**:
  - Conversational Q&A about markets and investing
  - Full message history
  - System context: Can ask about market, portfolio, investing
  - Example questions provided
  - Typing indicator during AI response
  - Dynamic greeting (morning/afternoon/evening)
- **Constraints**: Assistant refuses to recommend specific stocks
- **Context**: Includes recent insights and portfolio data

#### market-brief/page.js
- **Purpose**: Historical market insights and analysis
- **Features**:
  - Displays insights from latest analysis run
  - Filters for market, sector, news types
  - Shows title, reason, suggested action
  - Confidence level badges
  - Loading state with skeleton screens
  - Empty state when no analysis run yet
- **Sorting**: Reverse chronological (most recent first)

### API Routes

#### /api/run-all/route.js
- **Purpose**: Orchestrates complete analysis pipeline
- **Execution Sequence**:
  1. Authenticates user session
  2. Fetches user portfolio holdings
  3. Maps stocks to sectors (INFY/TCS→IT, HDFCBANK→Banking, etc.)
  4. Calculates portfolio sector exposure percentages
  5. Runs all 5 agents in parallel (market, news, sector, opportunity, risk)
  6. Runs decision engine to synthesize insights
  7. Personalizes decision for user profile
  8. Applies portfolio concentration limits
  9. Saves decision history and adaptive weights
  10. Returns complete analysis bundle
- **Portfolio Integration**: Gets holdings, calculates exposure, impacts decisions
- **Duration**: ~30-60 seconds for full pipeline
- **Error Handling**: Returns partial results if individual agents fail

#### /api/insights/route.js
- **Purpose**: Fetch latest insights from analysis run
- **Logic**:
  1. Gets most recent run_id from insights table
  2. Retrieves all insights from that run
  3. Deduplicates by type (keeps latest of each type)
  4. Returns array of unique insights
- **Response**:
  ```javascript
  {
    success: boolean,
    data: array of insights (or empty if no runs)
  }
  ```

#### /api/chat/route.js (Main Chat Endpoint)
- **Purpose**: Process user messages in chat interface
- **Context Passed**:
  - Market data (nifty price, sector changes)
  - Sector analysis (top sectors, rotation signals)
  - News sentiment
  - Risk assessment
  - Opportunities detected
  - Final decision output
  - User portfolio data
- **System Prompt Features**:
  - Reminds AI it's NOT a stock advisor
  - Enforces safe language (no "best stock", "strong buy")
  - Respects final decision actions
  - References context data
  - Beginner mode: emphasizes learning
  - Investor mode: mentions exposure, risk
- **Constraints**: Never recommends specific stocks
- **Output**: Plain text, no markdown

#### /api/assistant/route.js (Full-Page Assistant)
- **Purpose**: Assistant page backend for full-screen chat
- **Features**:
  - Fetches recent insights for context
  - Includes market intelligence in prompt
  - Requires disclaimer about AI-generated insights
  - Similar constraints to /api/chat but formatted differently
- **Output**: JSON with success flag and reply text

#### /api/market-data/route.js
- **Purpose**: Provides live market data for dashboard indicators
- **Data Fetched** (via Yahoo Finance):
  - NIFTY 50 (^NSEI)
  - Bank Nifty (^NSEBANK)
  - IT Index (^CNXIT)
  - Gold (GC=F) - converted to INR
  - USD/INR (INR=X)
- **Format**: {name, value, change%, positive boolean}
- **Caching**: Updated every 5 minutes on frontend
- **Error Handling**: Returns "--" for failed fetches

#### /api/patterns/route.js
- **Purpose**: Provides historical signal patterns for decision engine
- **Returns**: Pattern data from decision-memory including signal impacts

#### /api/trading/route.js
- **Purpose**: Trading engine endpoint for quant-based execution
- **Input**: market sentiment, sector strength, risk level, exposure, weights
- **Output**: Action, confidence score, position size, stop loss, take profit
- **Mode**: Routes to trading engine via system.js

#### /api/investing/route.js
- **Purpose**: Investing engine endpoint for advice generation
- **Input**: Market, news, sector, opportunity, risk data
- **Output**: Advice, explanation, risk level, confidence
- **Mode**: Routes to investing engine via system.js

#### /api/agents/market/route.js
- **Purpose**: Individual market agent endpoint
- **Returns**: Result from runMarketAgent()
- **Response**:
  ```javascript
  {
    success: boolean,
    data: market insight object
  }
  ```

#### /api/agents/news/route.js
- **Purpose**: Individual news agent endpoint
- **Returns**: Result from runNewsAgent()

#### /api/agents/sector/route.js
- **Purpose**: Individual sector agent endpoint
- **Returns**: Result from runSectorAgent()

#### /api/agents/risk/route.js
- **Purpose**: Individual risk agent endpoint
- **Returns**: Result from runRiskAgent()

#### /api/agents/opportunity/route.js
- **Purpose**: Individual opportunity agent endpoint
- **Returns**: Result from runOpportunityAgent()

#### /api/test-decision/route.js
- **Purpose**: Test endpoint for decision engine
- **Inputs**: Hard-coded bullish market, tech sector, low risk, 10% exposure
- **Output**: Detailed scoring breakdown with contributions
- **Used For**: Development/QA of scoring system

#### /api/test-weights/route.js
- **Purpose**: Test endpoint for adaptive weights system
- **Output**: Current dynamic weights from decision-memory
- **Used For**: Verify weight adaptation logic

#### /api/trade-stats/route.js
- **Purpose**: Fetch trading statistics for analysis
- **Output**: Trade statistics by category (sector, market sentiment, risk level)

#### /api/update-trade/route.js
- **Purpose**: Update trade outcome after position closes
- **Functionality**: Records win/loss for learning system

#### /api/trading-test/route.js
- **Purpose**: Test trading execution logic

---

## REACT COMPONENTS (components/)

### Dashboard Components

#### AIInsightHero.jsx
- **Purpose**: Feature card for primary market insight
- **States**:
  - Loading: Skeleton animation
  - Empty: Call-to-action for first analysis
  - Active: Shows insight with features
- **Display Elements**:
  - AI analyst status indicator
  - Key feature grid (Market analysis, Opportunity detection, Risk alerts)
  - Insight title and reason
  - Suggested action
  - Confidence badge (high/medium/low color-coded)
  - Time ago metadata
- **Styling**: Gradient blue background, white text

#### MarketSnapshot.jsx
- **Purpose**: Live market ticker display
- **Features**:
  - 5-minute refresh interval
  - Horizontal scrollable card list
  - Color-coded by positive/negative change
  - Shows name, value, change percentage
  - Live indicator dot
  - Last fetch timestamp
- **Data Source**: /api/market-data endpoint
- **Loading State**: Skeleton animation

#### OpportunityRadar.jsx
- **Purpose**: Display investment opportunities detected by AI
- **Features**:
  - Green header with TrendingUp icon
  - Opportunity count badge
  - Card list with asset name
  - Confidence levels color-coded
  - Reasoning text
  - Suggested action
  - Time ago metadata
  - Empty state: "Scanning for opportunities..."
- **Loading State**: Animated skeleton cards

#### RiskAlerts.jsx
- **Purpose**: Display detected market risks
- **Features**:
  - Red header with ShieldAlert icon
  - Risk count badge
  - Card list with risk area
  - Severity levels (high/medium/low) color-coded
  - Reasoning text
  - Suggested protective action
  - Time ago metadata
  - Empty state: "No alerts right now" with checkmark
- **Loading State**: Animated skeleton cards

#### InsightFeed.jsx
- **Purpose**: Detailed list of all insights
- **Features**:
  - Uses InsightCard component
  - Handles loading, error, and empty states
  - Time ago metadata for each
  - Error display with troubleshooting hint
- **Error State**: Shows alert icon and API key troubleshooting message

#### PortfolioCard.jsx
- **Purpose**: Summary of user's portfolio
- **Features**:
  - Total invested amount in INR
  - Holdings count
  - Top 3 holdings display
  - "+X more holdings" indicator
  - Button to manage portfolio
  - Empty state: CTA to add holdings
- **Styling**: Gradient blue background like AIInsightHero
- **Real-time**: Fetches from Supabase on mount

#### PortfolioInput.js
- **Purpose**: Add/remove portfolio holdings
- **Features**:
  - Input fields: name, symbol, quantity, asset type, avg_buy_price
  - Quick add button
  - Holdings list with delete capability
  - Total invested calculation
  - Real-time Supabase sync
- **Validation**: Requires symbol and quantity

#### Chatbot.js
- **Purpose**: Floating chat widget on dashboard
- **Features**:
  - Fixed bottom-right button to open/close
  - Conversation history
  - Auto-scroll to latest message
  - Typing indicator while AI responds
  - User messages right-aligned (blue), AI left-aligned (white)
  - System instructions in initial message
- **Context Passing**: Sends all result data to /api/chat
- **Styling**: Dark blue theme matching brand

#### MarketBriefSection.jsx
- **Purpose**: Collapsible market brief summary
- **Features**:
  - Toggle expand/collapse
  - Shows most recent insight preview in collapsed state
  - Detailed list of all insights when expanded
  - Grouped by type
  - Shows title, reason, suggested action
- **Empty State**: "Run analysis to see market brief"

### UI Components

#### InsightCard.jsx
- **Purpose**: Reusable insight card for consistent display
- **Props**: type, title, reason, confidence, suggested_action, isLoading, id
- **Features**:
  - Type label (uppercase)
  - Confidence badge color-coded
  - Type-based left border color:
    - market: blue
    - opportunity: green
    - risk: red
    - news: purple
    - sector: amber
  - Title, reason text
  - Suggested action section
  - Helpful/Not Helpful voting buttons
  - Vote feedback saved to Supabase
  - Loading skeleton animation
- **Voting**: Records feedback with insight_id and user_id

---

## ENGINE MODULES (engines/)

### Trading Engine

#### engines/trading/engine.js
- **Purpose**: Quantitative trading execution logic
- **Function**: `runTradingEngine(input)`
  - Takes market sentiment, sector strength, risk level, exposure, weights
  - Calls `buildDecisionAsync()` from quant-engine
  - Calculates execution plan with risk management
- **Execution Plan Calculation**:
  - Risk per trade: 1% base, adjusted by confidence
  - Stop loss: 2-4% based on risk level
  - Take profit: 2x stop distance
  - Risk/reward ratio: 2:1
  - Position sizing with risk adjustment
- **Output**:
  ```javascript
  {
    action: string,
    confidenceScore: number,
    positionSize: number,
    entry: number,
    stopLoss: number,
    takeProfit: number,
    riskPerTrade: number,
    riskRewardRatio: number
  }
  ```

### Investing Engine

#### engines/investing/engine.js
- **Purpose**: LLM-based advisory for long-term investing
- **Function**: `runInvestingEngine(input)`
  - Aggregates all agent outputs
  - Generates personalized advice
  - Considers portfolio context
  - Assesses risk level and confidence
- **Output**:
  ```javascript
  {
    advice: string,
    why: string (detailed explanation),
    riskLevel: 'high' | 'medium' | 'low',
    confidence: 'high' | 'medium' | 'low'
  }
  ```

---

## SCRIPTS & QA TESTING (scripts/)

### Test Execution Scripts

#### qa-trade-adapt-test.mjs
- **Purpose**: QA test for adaptive weight system
- **Functionality**: Tests how weights adjust based on trade outcomes
- **Output**: Test results in qa-trade-adapt-test.json

#### qa-strategy-selection.mjs
- **Purpose**: Test strategy selection logic
- **Validates**: Correct strategy chosen for market conditions

#### qa-adaptive-weight-impact.mjs
- **Purpose**: Measure impact of adaptive weights on decisions
- **Analyzes**: How weight changes affect final action recommendations

#### qa-trade-find-open.mjs
- **Purpose**: Identify open positions in portfolio
- **Finds**: Unclosed trades for analysis

#### qa-trade-sim.mjs
- **Purpose**: Simulate trading scenarios
- **Tests**: Decision engine against historical market data

#### qa-trade-report.mjs
- **Purpose**: Generate comprehensive trading report
- **Output**: Written to qa-trade-report.json
- **Includes**: Win rates, drawdowns, performance metrics

### Test Data

#### qa-trade-adapt-test.json
- **Purpose**: Sample test data for adaptive weight testing
- **Format**: Trade records with outcomes and metadata

#### qa-trade-report.json
- **Purpose**: Generated trading analysis report
- **Content**: Performance statistics and metrics

---

## PUBLIC ASSETS (public/)

#### Static Assets
- **favicon.ico**: App icon
- **next.svg, vercel.svg, window.svg, globe.svg, file.svg**: Brand/UI icons
- **Purpose**: Static assets served by Next.js

---

## DOCUMENTATION FILES

### AGENTS.md
- **Content**: Warning about breaking changes in Next.js 16
- **Purpose**: Reminder to check node_modules/next/dist/docs for updated APIs

### CONTEXT.md
- **Purpose**: Current state overview of project
- **Includes**: Technology stack, file structure, agent descriptions
- **Audience**: Developers and documentation

### DETAILS.md
- **Purpose**: Complete technical documentation
- **Sections**:
  - Project architecture
  - Database schema
  - Authentication flow
  - Data pipeline
  - Agent system details
  - Decision engine logic
  - Decision memory system
  - Complete API endpoint reference
  - Frontend components & flow
  - Core utilities
  - Code walkthroughs

### README.md
- **Purpose**: Project overview for GitHub/documentation
- **Standard Next.js README structure**

### CLAUDE.md
- **Purpose**: Agent-specific instructions
- **References**: AGENTS.md for Next.js rules

---

## ARCHITECTURE OVERVIEW

### System Components

```
USER LAYER
├─ Browser Frontend (React 19)
│  └─ Dashboard, Portfolio, Assistant, Admin pages
│
PRESENTATION LAYER
├─ Next.js Pages (app/)
├─ React Components (components/)
└─ Global Styling (Tailwind CSS)

API LAYER
├─ Route Handlers (app/api/)
├─ Agent Endpoints
├─ Data Endpoints
└─ LLM Integration Endpoints

BUSINESS LOGIC LAYER
├─ Agents System (agents/)
│  ├─ Market Agent
│  ├─ News Agent
│  ├─ Sector Agent
│  ├─ Opportunity Agent
│  ├─ Risk Agent
│  ├─ Decision Engine
│  ├─ Personalization Engine
│  └─ Portfolio Exposure Engine
├─ Engines (engines/)
│  ├─ Trading Engine
│  └─ Investing Engine
└─ Libraries (lib/)

DATA LAYER
├─ Supabase Database
│  ├─ Auth (users, sessions)
│  ├─ Profiles
│  ├─ Holdings
│  ├─ Insights
│  ├─ Trades
│  ├─ Learning Data
│  └─ Feedback
└─ External APIs
   ├─ Yahoo Finance
   ├─ Alpha Vantage
   ├─ NewsAPI
   ├─ Gemini/Groq LLM
   └─ Supabase Auth

UTILITIES
├─ Data Fetchers
├─ JSON Parsers
├─ Decision Memory
└─ Trade Journal
```

### Authentication Flow
1. **Signup/Login** (app/login)
   - User submits email/password
   - Supabase auth processes
   - On signup: creates profile record, redirects to onboarding
   - On signin: redirects to dashboard

2. **Middleware Checks** (middleware.js)
   - Validates session cookie
   - Redirects to /login if not authenticated
   - Redirects to /onboarding if profile incomplete
   - Allows /login and /onboarding without auth
   - Allows all /api routes without auth

3. **Onboarding** (app/onboarding)
   - 3-step questionnaire
   - Saves profile: risk_tolerance, investment_goal, experience_level
   - Marks onboarding_complete = true
   - Redirects to dashboard

4. **Session Management**
   - Supabase auth helpers for NextJS
   - Server-side auth in middleware
   - Browser-side auth in components
   - Auto-refresh tokens

### Data Flow for Analysis

1. **User clicks "Run AI Analysis"**
   ↓
2. **Fetch user holdings and portfolio sectors**
   ↓
3. **Parallelize 5 agents:**
   - Market Agent: analyze Nifty, sectors, sentiment
   - News Agent: fetch headlines, assess impact
   - Sector Agent: detect rotation, capital flows
   - Opportunity Agent: find ETF opportunities
   - Risk Agent: identify protective measures
   ↓
4. **Decision Engine synthesizes:**
   - Extracts inputs from all agents
   - Calculates quant score
   - Determines action and confidence
   - Builds explanatory narrative
   ↓
5. **Personalization Engine customizes:**
   - Applies user risk tolerance
   - Tailors for investment goal
   - Adjusts language for experience level
   ↓
6. **Portfolio Exposure Engine enforces:**
   - Checks sector concentration
   - Overrides if >40% exposure
   - Adds concentration warnings
   ↓
7. **Save to Supabase:**
   - Store all insights with run_id
   - Update decision_history table
   - Record adaptive weights used
   ↓
8. **Frontend retrieves and displays:**
   - Fetch latest run insights
   - Populate dashboard cards
   - Show chatbot context data

---

## DECISION LOGIC

### Scoring System (Quant Engine)

**Four Input Dimensions:**

1. **Market Sentiment** (25% weight)
   - Input: bullish, neutral, bearish
   - Conversion: Uses pattern accuracy * win rate
   - Produces: 0-1 score

2. **Sector Strength** (30% weight)
   - Input: strong, weak (based on top sector %change)
   - Conversion: Pattern-based scoring
   - Produces: 0-1 score

3. **Risk Level** (25% weight)
   - Input: high, medium, low
   - Conversion: Pattern accuracy weighted
   - Produces: 0-1 score

4. **Portfolio Exposure** (20% weight)
   - Input: exposure percentage (0-100)
   - Logic: Penalizes if >40% or >70%
   - Produces: -1 to 0 range (negative/penalty)

**Final Score Calculation:**
```
score = (market_score × 0.25) + 
        (sector_score × 0.30) + 
        (risk_score × 0.25) + 
        (exposure_penalty × 0.20)
```

**Score-to-Action Mapping:**
- score < -0.3 → avoid/hold
- -0.3 to 0.3 → hold/observe
- score > 0.3 → accumulate/buy

**Penalties Applied:**
- High risk environment: -0.1
- Overexposure (>15%): -0.05

### Adaptive Weights System

**Purpose**: Adjust decision weights based on historical trade performance

**Data Sources**:
- Recent trades from database
- Trade outcomes (win/loss)
- Categorized by: sector, market sentiment, risk level

**Algorithm**:
1. Group trades by category
2. Calculate win rate per category
3. Calculate average accuracy with recency weighting
4. Recency factor: `1 / (1 + days_old / 7)` (trades from 7 days ago: 50% weight)
5. Adjust weights:
   - If category win rate > 60%: increase weight +5%
   - If category win rate < 40%: decrease weight -5%
6. Normalize weights to sum to 1.0
7. Clamp each weight between 0.1 and 0.6

**Example**:
- If IT sector trades have 70% win rate: increase sector weight
- If high-risk trades have 30% win rate: decrease risk weight
- Rebalance all weights proportionally

---

## KEY IMPLEMENTATION PATTERNS

### Error Handling Pattern
```javascript
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  // Fall back to safe default or retry
  return defaultValue;
}
```

### Data Validation Pattern
```javascript
// Clean and parse potentially malformed JSON from LLMs
const parsed = cleanAndParseJSON(rawResponse);
if (!parsed || !validateJSONStructure(parsed, requiredFields)) {
  throw new Error('Invalid response structure');
}
```

### Async Pipeline Pattern
```javascript
// Sequential steps with error recovery
const step1 = await fetchData();
const step2 = await processData(step1);
const step3 = await storeResults(step2);
return step3;
```

### Real-time Update Pattern (Frontend)
```javascript
// Subscribe to Supabase changes
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', { event: 'INSERT' }, callback)
  .subscribe();
// Cleanup on unmount
return () => supabase.removeChannel(channel);
```

---

## NOTABLE FEATURES & CONSTRAINTS

### AI Safety & Compliance
- **No stock picking**: Agents prohibited from recommending specific stocks
- **Safe language**: Uses "can be considered", "showing strength" instead of "buy"
- **Tone constraints**: Enforced in every agent prompt
- **Disclaimer**: Chat endpoints add disclaimer that insights are AI-generated, not SEBI advice

### Performance Optimizations
- **Rate limiting**: 4-second delays in agent calls to prevent throttling
- **Graceful fallback**: Multiple data sources (Yahoo Finance → AlphaVantage → Static data)
- **Parallel execution**: Agents run simultaneously where possible
- **Caching**: Market data updates every 5 minutes on frontend

### Portfolio Safety
- **Concentration limits**: Forces hold if sector >40% of portfolio
- **Exposure tracking**: Maps stocks to sectors for exposure calculation
- **Override logic**: Strictest rules apply when overexposed

### Learning System
- **Trade recording**: Every trade stored with outcome
- **Pattern building**: Extracts signal patterns from trade history
- **Recency weighting**: Recent successful patterns weighted higher
- **Weight adaptation**: Future decisions use learned weights

---

## DATABASE SCHEMA (Supabase Tables)

### users (auth.users)
- id, email, encrypted_password, email_confirmed_at, etc.
- Managed by Supabase Auth

### profiles
- id (user_id), full_name, risk_tolerance, investment_goal, experience_level, onboarding_complete

### holdings
- id, user_id, name, symbol, quantity, avg_buy_price, asset_type, created_at

### insights
- id, type (market|news|sector|opportunity|risk|decision), title, reason, confidence, suggested_action, run_id, raw_data, created_at

### trades
- id, user_id, status (open|closed), outcome (win|loss|break-even), input (json), created_at, updated_at

### learning_data
- id, category, key, win_rate, adjustment, timestamp

### feedback
- id, user_id, insight_id, rating (helpful|not_helpful), created_at

### decision_history
- Stores snapshots of decision engine output

---

## ENVIRONMENT VARIABLES REQUIRED

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# LLM
GROQ_API_KEY=...

# News
NEXT_PUBLIC_NEWS_API_KEY=... (or NEWS_API_KEY=...)

# Market Data
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=... (or ALPHA_VANTAGE_KEY=...)
```

---

## FUTURE ENHANCEMENT OPPORTUNITIES

1. **Advanced Technical Analysis**: Add moving averages, RSI, MACD to agent inputs
2. **Backtesting Engine**: Simulate strategy against historical data
3. **Portfolio Optimization**: Suggest sector allocations based on risk profile
4. **Real-time Alerts**: Push notifications for major market moves
5. **Export Reports**: PDF/CSV of insights and analysis
6. **Mobile App**: React Native or PWA version
7. **Advanced Personalization**: Segment users by behavior patterns
8. **Predictive Models**: ML-based price movement predictions
9. **Multi-language Support**: Support for regional languages
10. **Sector Deep Dives**: Detailed analysis of underperforming sectors

---

## TESTING & DEBUGGING

### Test Endpoints
- `/api/test-decision`: Validates scoring logic
- `/api/test-weights`: Validates weight adaptation
- `scripts/qa-*.mjs`: Comprehensive QA tests

### Common Issues & Solutions

**Issue**: Insights not loading
- **Solution**: Verify API keys in environment variables
- **Check**: /api/insights endpoint for database errors

**Issue**: Chat not responding
- **Solution**: Check Groq/Gemini API quota and keys
- **Check**: /api/chat endpoint logs

**Issue**: Portfolio not affecting decisions
- **Solution**: Verify holdings are saved to database
- **Check**: /api/run-all portfolio calculation logic

**Issue**: Weights not adapting
- **Solution**: Verify trades are being recorded with outcomes
- **Check**: /api/test-weights endpoint

---

## DEPLOYMENT NOTES

- **Hosting**: Vercel (recommended for Next.js)
- **Database**: Supabase hosted (PostgreSQL)
- **LLM APIs**: Groq (primary), fallback from Gemini setup
- **Market Data**: Yahoo Finance (primary), Alpha Vantage (secondary)
- **Environment**: Node.js 18+ recommended
- **Build**: `npm run build` → `npm start`
- **Monitoring**: Check Supabase dashboard for errors
- **Rate Limiting**: Implemented in agents (4s delay, retry logic)

---

---

## LATEST UPDATES (May 3, 2026) - SUPABASE INTEGRATION & REAL PATTERN EXTRACTION

### Phase 1: Supabase Authentication & Server Clients

**Files Modified:**
- `lib/supabase-server.js` (Created)
- `lib/supabase-browser.js` (Created)
- `middleware.js` (Updated)
- `app/api/trading-test/route.js` (Updated)
- `app/api/run-all/route.js` (Updated)

**Changes:**
✅ Created `createSupabaseServerClient()` - Uses anonymous key with Next.js auth helpers
✅ Created `createBrowserClient()` - Browser-safe Supabase client
✅ Updated middleware to use `createServerClient()` with cookie forwarding
✅ All API routes now extract user from session: `supabase.auth.getUser()`
✅ User ID passed to all functions for isolation: `userId = session?.user?.id`

**Authentication Flow:**
```
Browser Login → Supabase Auth → Session Cookie
     ↓
API Route (Middleware) → Extract User ID from Cookie
     ↓
Database Queries Filtered by user_id
```

---

### Phase 2: Trading Trades Table & Schema

**Database Table Created:**
```sql
CREATE TABLE IF NOT EXISTS trading_trades (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  market_sentiment TEXT,
  sector TEXT,
  risk_level TEXT,
  volatility NUMERIC,
  action TEXT,
  confidence_score NUMERIC,
  score NUMERIC,
  entry NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  quantity NUMERIC,
  outcome TEXT,
  profit_loss NUMERIC,
  strategy TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_trading_trades_user_id ON trading_trades(user_id);
CREATE INDEX idx_trading_trades_status ON trading_trades(status);
```

**Key Features:**
✅ User isolation via `user_id` foreign key
✅ Full trade lifecycle: `status` = open/closed
✅ Outcome tracking: `outcome` = win/loss/partial
✅ PnL calculation: `profit_loss` = (exit_price - entry) × quantity
✅ Strategy versioning: `strategy` field for A/B testing

---

### Phase 3: Trade Lifecycle APIs

**1. Create Trade (Save) - `app/api/trading-test/route.js`**
```javascript
// Insert new trade with user_id
const tradeData = {
  id: uuidv4(),
  user_id: user.id,
  market_sentiment, sector, risk_level,
  entry: result.entry,
  stop_loss: result.stopLoss,
  take_profit: result.takeProfit,
  quantity: result.finalPosition,
  status: 'open'
};
await supabase.from('trading_trades').insert([tradeData]);
```

**2. Close Trade (Update) - `app/api/update-trade/route.js`**
```javascript
// Calculate PnL
const pnl = (exitPrice - trade.entry) * trade.quantity;

// Determine outcome
if (exitPrice >= trade.take_profit) outcome = 'win';
else if (exitPrice <= trade.stop_loss) outcome = 'loss';
else outcome = 'partial';

// Update in database
await supabase.from('trading_trades')
  .update({ status: 'closed', outcome, profit_loss: pnl })
  .eq('id', id).eq('user_id', user.id);
```

**3. Trade Statistics - `app/api/trade-stats/route.js`**
```javascript
// Fetch closed trades per user
const closedTrades = await supabase
  .from('trading_trades')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'closed');

// Calculate metrics
wins = closedTrades.filter(t => t.outcome === 'win').length;
winRate = wins / closedTrades.length;

// Breakdown by market, sector, risk
categoryBreakdown = group(closedTrades, field);
```

---

### Phase 4: Real Pattern Extraction

**New Function: `getRealPatterns(userId)` in `lib/decision-memory.js`**

**Purpose:** Extract adaptive patterns from user's closed trades instead of using mock data

**Algorithm:**
```javascript
1. Fetch closed trades: .eq('user_id', userId).eq('status', 'closed')
2. Handle insufficient data: if < 5 trades, return empty patterns
3. Aggregate by dimensions:
   - Market sentiment: bullish/neutral/bearish
   - Sector: user's traded sectors
   - Risk level: high/medium/low
4. Calculate metrics per group:
   - total: count of trades
   - wins: count where outcome = 'win'
   - winRate: wins / total
   - avgAccuracy: winRate - 0.5 (scaled to [-0.5, 0.5])
5. Return structure:
   {
     market: { bullish: {winRate, avgAccuracy, count}, ... },
     sector: { IT: {winRate, avgAccuracy, count}, ... },
     risk: { high: {winRate, avgAccuracy, count}, ... }
   }
```

**Example Output:**
```javascript
{
  market: {
    bullish: { winRate: 0.75, avgAccuracy: 0.25, total: 4 },
    neutral: { winRate: 0.5, avgAccuracy: 0, total: 2 }
  },
  sector: {
    technology: { winRate: 0.8, avgAccuracy: 0.3, total: 5 },
    banking: { winRate: 0.4, avgAccuracy: -0.1, total: 3 }
  },
  risk: {
    low: { winRate: 0.7, avgAccuracy: 0.2, total: 10 }
  }
}
```

**Debug Logging:**
```
REAL_PATTERNS: {full pattern object}
REAL_PATTERNS_SOURCE: 5 closed trades for user 920b9cf9-d5dd-469c-b976-c6ae8d3ed8ef
```

---

### Phase 5: Pattern Integration into Decision Engine

**1. Quant Engine (`lib/quant-engine.js`)**
- Added `getRealPatterns` import
- Modified `buildDecisionAsync()` to use real patterns when userId available
- Modified `runQuantEngine()` to call `getRealPatterns(userId)` instead of static patterns
- Fallback to `getSignalPatterns()` when no userId provided

**2. Trading Test Route (`app/api/trading-test/route.js`)**
- Fetch real patterns: `getRealPatterns(user.id)`
- Log: `REAL_PATTERNS_LOADED: {patterns}`
- Pass userId to `getDynamicWeights(user.id)`

**3. Run-All Route (`app/api/run-all/route.js`)**
- Fetch real patterns from user's closed trades
- Log: `REAL_PATTERNS_AVAILABLE: {patterns}`
- Graceful fallback if pattern loading fails
- Pass userId to decision engine

---

### Phase 6: Table Migration (trades → trading_trades)

**All Occurrences Updated:**

`lib/trade-journal.js` (4 functions):
```
✅ createTradeRecord() - .from('trades') → .from('trading_trades')
✅ getTradeById() - .from('trades') → .from('trading_trades')
✅ updateTradeById() - .from('trades') → .from('trading_trades')
✅ getTradeStats() - .from('trades') → .from('trading_trades')
```

**Debug Logging Added to Each:**
```javascript
console.log("USING TABLE: trading_trades");
```

**Other Files Already Using `trading_trades`:**
- `lib/decision-memory.js` - getRealPatterns()
- `app/api/update-trade/route.js` - Trade closure
- `app/api/trading-test/route.js` - Trade creation
- `app/api/trade-stats/route.js` - Statistics

**Verification:**
✅ Zero references to `.from('trades')` remain
✅ All 15 trading references use `trading_trades`
✅ All references include user_id filtering

---

### Phase 7: QA Testing & Verification

**Verified Trade Closure (May 3, 2026):**
```
Trade ID: 78a8624c-80aa-445f-8710-f8b2a489a60d
Entry: 100
Exit: 104
Quantity: 0.432
Expected PnL: (104-100) × 0.432 = 1.728
Actual PnL: 1.728 ✅
Outcome: win ✅
Status: closed ✅
Database: trading_trades ✅
```

**API Endpoints Tested:**
- ✅ `/api/trading-test` - Creates trades with Supabase auth
- ✅ `/api/update-trade` - Closes trades, calculates PnL correctly
- ✅ `/api/trade-stats` - Retrieves user-specific statistics
- ✅ `/api/run-all` - Loads real patterns, integrates with decision engine

---

### System Architecture Post-Integration

```
User Authentication
    ↓
Middleware: Extract user_id from session
    ↓
API Routes: All pass userId to functions
    ↓
↙          ↓          ↘
Trading  Decision  Portfolio
Engine   Memory    Context
  ↓        ↓          ↓
  └────────┴──────────┘
         ↓
Supabase Database
  ├─ trading_trades (user-isolated)
  ├─ decision_history (user-isolated)
  └─ insights (run_id tracked)
  ↓
Real Pattern Extraction
  ├─ Fetch closed trades
  ├─ Aggregate win rates
  ├─ Calculate accuracy
  └─ Return patterns
  ↓
Future Decisions Use Real Patterns
  (Adaptive, learning-based)
```

---

### Key Improvements

**Before:**
- ❌ All trades in single table (no isolation)
- ❌ Mock patterns (static, not learning)
- ❌ No user authentication in APIs
- ❌ Trade stats global, not per-user

**After:**
- ✅ User-isolated `trading_trades` table
- ✅ Real pattern extraction from closed trades
- ✅ Supabase auth in all API routes
- ✅ Per-user trade statistics
- ✅ Adaptive decision weights based on historical performance
- ✅ Full PnL tracking and outcome recording
- ✅ Learning system ready for production

---

### Files Modified Summary

| File | Type | Changes |
|------|------|---------|
| `lib/supabase-server.js` | Create | Server-side Supabase client |
| `lib/supabase-browser.js` | Create | Browser-side Supabase client |
| `lib/decision-memory.js` | Update | Added `getRealPatterns()` function |
| `lib/trade-journal.js` | Update | Migrated to `trading_trades`, added debug logs |
| `lib/quant-engine.js` | Update | Import `getRealPatterns`, use real patterns |
| `lib/system.js` | Verify | No changes (clean separation) |
| `middleware.js` | Update | Supabase server client with cookies |
| `app/api/trading-test/route.js` | Update | Auth, real patterns loading |
| `app/api/update-trade/route.js` | Create | Trade closure, PnL calculation |
| `app/api/trade-stats/route.js` | Create | Per-user statistics |
| `app/api/run-all/route.js` | Update | Real patterns integration |
| `engines/investing/engine.js` | Verify | No changes (unaffected) |
| `engines/trading/engine.js` | Verify | Already using quant-engine |

---

### Next Steps

1. **Deploy to production** - Run migrations on Supabase
2. **Monitor learning system** - Collect trade outcomes
3. **Add backtesting** - Validate patterns against historical data
4. **Advanced analytics** - Dashboard showing pattern confidence
5. **User feedback loop** - Collect ratings on decision quality

**Status**: ✅ READY FOR PRODUCTION

---

**End of Analysis Document**