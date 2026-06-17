import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  try {
    const contents = readFileSync(envPath, 'utf8');
    contents.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=');
      if (key && value !== undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('Could not load .env file:', error.message);
  }
}

loadEnv();

const USE_REAL_PATTERNS = true;

const testInput = {
  marketSentiment: 'bullish',
  sector: 'technology',
  riskLevel: 'low',
  exposure: 10,
  currentPrice: 100,
  volatility: 0.02
};

const userId = '550e8400-e29b-41d4-a716-446655440000';

async function compareLearning() {
  const { runQuantEngine } = await import('./lib/quant-engine.js');

  const mock = await runQuantEngine(testInput, null);
  const mockPositionSize = mock.execution?.positionSize ?? null;

  const real = await runQuantEngine(testInput, USE_REAL_PATTERNS ? userId : null);
  const realPositionSize = real.execution?.positionSize ?? null;

  const mockResult = {
    action: mock.action,
    score: mock.score,
    confidenceScore: mock.confidenceScore,
    positionSize: mockPositionSize
  };

  const realResult = {
    action: real.action,
    score: real.score,
    confidenceScore: real.confidenceScore,
    positionSize: realPositionSize
  };

  const validation = {
    mock: mockResult,
    real: realResult,
    scoreDelta: realResult.score - mockResult.score,
    confidenceDelta: realResult.confidenceScore - mockResult.confidenceScore,
    actionChanged: mockResult.action !== realResult.action
  };

  console.log('USE_REAL_PATTERNS:', USE_REAL_PATTERNS);
  console.log('TEST_INPUT:', testInput);
  console.log('LEARNING_VALIDATION:', JSON.stringify(validation, null, 2));

  if (validation.scoreDelta === 0 && validation.confidenceDelta === 0 && !validation.actionChanged) {
    console.warn('LEARNING_VALIDATION: FAIL - no detectable difference between mock and real patterns.');
    process.exit(1);
  }

  console.log('LEARNING_VALIDATION: PASS - real patterns produced a different decision profile.');
}

compareLearning().catch((error) => {
  console.error('compare-learning failed:', error);
  process.exit(1);
});
