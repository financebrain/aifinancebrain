// Test Trade Execution Layer
import { calculateExecutionPlan } from './engines/trading/engine.js';

// Mock decision
const mockDecision = {
  action: 'buy',
  confidenceScore: 0.8,
  positionSize: 0.1
};

const currentPrice = 100;
const riskLevel = 'low';

try {
  const result = calculateExecutionPlan(mockDecision, currentPrice, riskLevel);
  console.log('Execution Plan Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Test error:', error);
}