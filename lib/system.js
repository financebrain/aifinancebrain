// Main System Controller - Dual-mode platform

import { runInvestingEngine } from '@/engines/investing/engine.js';
import { runTradingEngine } from '@/engines/trading/engine.js';

export async function runSystem(input, mode) {
  if (mode === 'investing') {
    return await runInvestingEngine(input);
  }

  if (mode === 'trading') {
    return await runTradingEngine(input);
  }

  throw new Error(`Unknown mode: ${mode}`);
}