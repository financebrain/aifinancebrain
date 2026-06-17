// Investing Engine - LLM-based guardian mode
// Uses agents for advice generation, portfolio awareness, explanations

import { runMarketAgent } from '../../agents/market-agent.js';
import { runNewsAgent } from '../../agents/news-agent.js';
import { runOpportunityAgent } from '../../agents/opportunity-agent.js';
import { runRiskAgent } from '../../agents/risk-agent.js';
import { runSectorAgent } from '../../agents/sector-agent.js';
import { personalizeDecision } from '../../agents/personalization-engine.js';

export async function runInvestingEngine(input) {
  const { market, news, sector, opportunity, risk, portfolio = {} } = input;

  // Run all agents
  const marketData = await runMarketAgent(market);
  const newsData = await runNewsAgent(news);
  const sectorData = await runSectorAgent(sector);
  const opportunityData = await runOpportunityAgent(opportunity);
  const riskData = await runRiskAgent(risk);

  // Generate advice based on agent outputs
  const advice = generateAdvice(marketData, newsData, sectorData, opportunityData, riskData);

  // Personalize for portfolio
  const personalized = await personalizeDecision({
    advice,
    portfolio,
    marketData,
    riskData
  });

  // Determine risk level and confidence
  const riskLevel = assessRiskLevel(riskData, portfolio);
  const confidence = assessConfidence(marketData, newsData, sectorData);

  return {
    advice: personalized.advice,
    why: personalized.explanation,
    riskLevel,
    confidence
  };
}

function generateAdvice(market, news, sector, opportunity, risk) {
  // Simple logic to combine agent outputs into advice
  if (risk.severity === 'high') {
    return 'Conservative approach recommended due to high risk.';
  }

  if (market.sentiment === 'bullish' && sector.top_sector) {
    return `Consider investing in ${sector.top_sector} sector given bullish market.`;
  }

  return 'Monitor market conditions closely.';
}

function assessRiskLevel(riskData, portfolio) {
  const riskScore = riskData.severity === 'high' ? 3 : riskData.severity === 'medium' ? 2 : 1;
  const portfolioRisk = Object.keys(portfolio).length > 5 ? 2 : 1;
  const totalRisk = riskScore + portfolioRisk;

  if (totalRisk >= 5) return 'high';
  if (totalRisk >= 3) return 'medium';
  return 'low';
}

function assessConfidence(market, news, sector, opportunity) {
  // Simple confidence based on data quality
  let confidence = 0;
  if (market.price) confidence += 0.3;
  if (news.sentiment) confidence += 0.3;
  if (sector.top_sector) confidence += 0.2;
  if (opportunity.signals) confidence += 0.2;

  if (confidence > 0.7) return 'high';
  if (confidence > 0.4) return 'medium';
  return 'low';
}