#!/usr/bin/env node

/**
 * QA Test: Generate 12-15 trades with varied conditions
 * Then close them with mix of wins/losses
 * Purpose: Build initial learning dataset for real pattern extraction
 */

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID for testing

// Test cases with variations
const testCases = [
  // Case 1: Bullish + Technology + Low Risk (3 trades)
  { market: 'bullish', sector: 'technology', risk: 'low', id: 'case1-1' },
  { market: 'bullish', sector: 'technology', risk: 'low', id: 'case1-2' },
  { market: 'bullish', sector: 'technology', risk: 'low', id: 'case1-3' },

  // Case 2: Bearish + Financials + High Risk (3 trades)
  { market: 'bearish', sector: 'financials', risk: 'high', id: 'case2-1' },
  { market: 'bearish', sector: 'financials', risk: 'high', id: 'case2-2' },
  { market: 'bearish', sector: 'financials', risk: 'high', id: 'case2-3' },

  // Case 3: Neutral + Mixed (2 trades)
  { market: 'neutral', sector: 'mixed', risk: 'medium', id: 'case3-1' },
  { market: 'neutral', sector: 'mixed', risk: 'medium', id: 'case3-2' },

  // Case 4: Bullish + Banking + Medium (3 trades)
  { market: 'bullish', sector: 'banking', risk: 'medium', id: 'case4-1' },
  { market: 'bullish', sector: 'banking', risk: 'medium', id: 'case4-2' },
  { market: 'bullish', sector: 'banking', risk: 'medium', id: 'case4-3' },

  // Case 5: Bearish + IT + Medium (2 trades)
  { market: 'bearish', sector: 'IT', risk: 'medium', id: 'case5-1' },
  { market: 'bearish', sector: 'IT', risk: 'medium', id: 'case5-2' },
];

// Win/Loss distribution: 60% wins, 40% losses
const winLossPattern = [
  true,  // case1-1: WIN
  true,  // case1-2: WIN
  false, // case1-3: LOSS
  false, // case2-1: LOSS
  true,  // case2-2: WIN
  false, // case2-3: LOSS
  true,  // case3-1: WIN
  false, // case3-2: LOSS
  true,  // case4-1: WIN
  true,  // case4-2: WIN
  false, // case4-3: LOSS
  false, // case5-1: LOSS
  true,  // case5-2: WIN
];

const trades = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTrade(testCase) {
  try {
    const params = new URLSearchParams({
      userId: TEST_USER_ID,
      market: testCase.market,
      sector: testCase.sector,
      risk: testCase.risk,
      price: 100,
      volatility: 0.02
    });

    const url = `${BASE_URL}/api/trading-test?${params.toString()}`;
    console.log(`\n[CREATE] ${testCase.id}`);
    console.log(`  URL: ${url}`);

    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      console.error(`  ❌ Error: ${data.error}`);
      return null;
    }

    const trade = {
      testCaseId: testCase.id,
      tradeId: data.tradeId,
      entry: data.data.entry,
      stopLoss: data.data.stopLoss,
      takeProfit: data.data.takeProfit,
      quantity: data.data.finalPosition,
      action: data.data.action,
      confidence: data.data.confidenceScore
    };

    console.log(`  ✅ Created trade: ${trade.tradeId}`);
    console.log(`     Entry: ${trade.entry}`);
    console.log(`     Stop Loss: ${trade.stopLoss}`);
    console.log(`     Take Profit: ${trade.takeProfit}`);
    console.log(`     Quantity: ${trade.quantity}`);

    return trade;
  } catch (error) {
    console.error(`  ❌ Error creating trade: ${error.message}`);
    return null;
  }
}

async function closeTrade(trade, shouldWin) {
  try {
    // Determine exit price
    const exitPrice = shouldWin ? trade.takeProfit : trade.stopLoss;
    const outcome = shouldWin ? 'WIN' : 'LOSS';

    console.log(`\n[CLOSE] ${trade.testCaseId} → ${outcome}`);
    console.log(`  Trade ID: ${trade.tradeId}`);
    console.log(`  Exit Price: ${exitPrice}`);

    const body = JSON.stringify({
      id: trade.tradeId,
      exitPrice: exitPrice
    });

    const res = await fetch(`${BASE_URL}/api/update-trade?userId=${TEST_USER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });

    const data = await res.json();

    if (!data.success) {
      console.error(`  ❌ Error: ${data.error}`);
      return false;
    }

    console.log(`  ✅ Closed: ${data.trade.outcome.toUpperCase()}`);
    console.log(`     PnL: ${data.trade.profitLoss}`);

    return true;
  } catch (error) {
    console.error(`  ❌ Error closing trade: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('QA TEST: GENERATE TRADE DATASET');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`Creating ${testCases.length} trades with varied conditions...`);
  console.log('Win/Loss ratio: 60% wins, 40% losses\n');

  // STEP 1: Create all trades
  console.log('STEP 1: CREATE TRADES');
  console.log('─────────────────────────────────────────────────────────');

  for (let i = 0; i < testCases.length; i++) {
    const trade = await createTrade(testCases[i]);
    if (trade) {
      trades.push(trade);
    }
    // Delay between requests to avoid rate limiting
    if (i < testCases.length - 1) {
      await sleep(1500);
    }
  }

  console.log(`\n✅ Created ${trades.length} trades`);

  // Wait before closing
  console.log('\nWaiting 2 seconds before closing trades...');
  await sleep(2000);

  // STEP 2: Close all trades
  console.log('\nSTEP 2: CLOSE TRADES');
  console.log('─────────────────────────────────────────────────────────');

  let winCount = 0;
  let lossCount = 0;

  for (let i = 0; i < trades.length; i++) {
    const shouldWin = winLossPattern[i] ?? true; // Default to win if pattern not defined
    const closed = await closeTrade(trades[i], shouldWin);

    if (closed) {
      if (shouldWin) {
        winCount++;
      } else {
        lossCount++;
      }
    }

    // Delay between requests
    if (i < trades.length - 1) {
      await sleep(1500);
    }
  }

  // STEP 3: Summary
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`Total Trades Created: ${trades.length}`);
  console.log(`Total Trades Closed: ${winCount + lossCount}`);
  console.log(`Wins: ${winCount} (${Math.round((winCount / (winCount + lossCount)) * 100)}%)`);
  console.log(`Losses: ${lossCount} (${Math.round((lossCount / (winCount + lossCount)) * 100)}%)`);

  // Test cases breakdown
  console.log('\nBreakdown by Case:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Case 1 (Bullish + Technology + Low): 3 trades');
  console.log('Case 2 (Bearish + Financials + High): 3 trades');
  console.log('Case 3 (Neutral + Mixed + Medium): 2 trades');
  console.log('Case 4 (Bullish + Banking + Medium): 3 trades');
  console.log('Case 5 (Bearish + IT + Medium): 2 trades');

  console.log('\n═════════════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE');
  console.log('═════════════════════════════════════════════════════════');
  console.log('\nNext: Check logs for:');
  console.log('  REAL_PATTERNS_SOURCE: should show 13 closed trades');
  console.log('  Pattern should NOT say insufficient data');
  console.log('\nRun: curl http://localhost:3000/api/patterns');
}

main().catch(console.error);
