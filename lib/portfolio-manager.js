import { supabase } from './supabase.js';
import { getOpenTrades } from './trade-journal.js';

// Compute portfolio state for a user based on open trades
export async function getPortfolioState(userId) {
  if (!userId) {
    console.log('PORTFOLIO_STATE: no userId provided, returning defaults');
    return {
      openTrades: [],
      portfolioHeat: 0,
      totalExposure: 0,
      allowNewTrade: true,
      sizeMultiplier: 1
    };
  }

  // Fetch open trades for the user from trading_trades table or local store
  let openTrades = [];
  try {
    openTrades = await getOpenTrades(userId);
  } catch (err) {
    console.error('PORTFOLIO_STATE: unexpected error fetching trades', err);
    openTrades = [];
  }

  // Calculate total exposure (sum of quantity fractions * 100 for percent)
  let totalExposure = 0;
  let heatSum = 0; // fraction of account at risk

  for (const t of openTrades) {
    const entry = Number(t.entry);
    const stop = Number(t.stop_loss);
    const qty = Number(t.quantity) || 0; // fraction of account (0-1)

    // exposure contribution: quantity fraction
    totalExposure += qty * 100;

    // risk per trade: stop distance as percent * quantity fraction => fraction of account at risk
    if (entry > 0 && !isNaN(stop) && stop > 0) {
      const stopPercent = Math.abs(entry - stop) / entry; // e.g., 0.03
      const tradeRiskFraction = stopPercent * qty; // fraction of account at risk
      heatSum += tradeRiskFraction;
    } else if (!isNaN(qty) && qty > 0) {
      // fallback: treat qty as exposure and estimate 1% stop by default
      heatSum += qty * 0.01;
    }
  }

  const portfolioHeat = Math.round(heatSum * 10000) / 100; // percent with 2 decimals (e.g., 3.25)

  // Rules
  const allowNewTrade = portfolioHeat < 5;
  let sizeMultiplier = 1;
  if (portfolioHeat < 2) sizeMultiplier = 1;
  else if (portfolioHeat >= 2 && portfolioHeat <= 4) sizeMultiplier = 0.75;
  else sizeMultiplier = 0.5;

  const state = {
    openTrades,
    portfolioHeat,
    totalExposure: Math.round(totalExposure * 100) / 100,
    allowNewTrade,
    sizeMultiplier
  };

  console.log('PORTFOLIO_STATE:', state);
  console.log('POSITION_ADJUSTMENT:', { sizeMultiplier });

  return state;
}
