#!/usr/bin/env node

/**
 * QA Verification: Check real patterns after trade generation
 * Verifies that pattern extraction has sufficient data (not "insufficient data" message)
 */

const BASE_URL = 'http://localhost:3000';

async function checkPatterns() {
  try {
    console.log('═════════════════════════════════════════════════════════');
    console.log('QA VERIFICATION: Check Real Patterns');
    console.log('═════════════════════════════════════════════════════════\n');

    console.log('Fetching patterns from /api/patterns...\n');

    const res = await fetch(`${BASE_URL}/api/patterns`);
    const patterns = await res.json();

    console.log('Response:');
    console.log(JSON.stringify(patterns, null, 2));

    // Check for success indicators
    console.log('\n═════════════════════════════════════════════════════════');
    console.log('VALIDATION');
    console.log('═════════════════════════════════════════════════════════\n');

    if (!patterns.market || !patterns.sector || !patterns.risk) {
      console.log('❌ Invalid pattern structure');
      return false;
    }

    const marketKeys = Object.keys(patterns.market).length;
    const sectorKeys = Object.keys(patterns.sector).length;
    const riskKeys = Object.keys(patterns.risk).length;

    console.log(`Market Sentiment Groups: ${marketKeys}`);
    console.log(`Sector Groups: ${sectorKeys}`);
    console.log(`Risk Level Groups: ${riskKeys}`);

    // Calculate total trades
    let totalTrades = 0;
    let totalWins = 0;

    for (const key in patterns.market) {
      const item = patterns.market[key];
      totalTrades += item.count || 0;
      totalWins += Math.round((item.winRate || 0) * (item.count || 0));
    }

    console.log(`\nTotal Trades Analyzed: ${totalTrades}`);
    console.log(`Estimated Total Wins: ${totalWins}`);

    if (totalTrades >= 10) {
      console.log('\n✅ SUCCESS: Sufficient trade data');
      console.log('   Real patterns are NOT showing "insufficient data" message');
      console.log('   System is ready for adaptive learning');
      return true;
    } else {
      console.log('\n⚠️  WARNING: Less than 10 trades in patterns');
      console.log(`   Current: ${totalTrades} trades`);
      console.log('   Need: >= 10 trades');
      return false;
    }
  } catch (error) {
    console.error('❌ Error fetching patterns:', error.message);
    return false;
  }
}

checkPatterns();
