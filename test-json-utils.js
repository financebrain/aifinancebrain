// Test script for json-utils.js
import { cleanAndParseJSON, validateJSONStructure } from './lib/json-utils.js';

// Test cases
const testCases = [
  '{"test": "normal json"}',
  '```json\n{"test": "with markdown"}\n```',
  '```json {"test": "with spaces"} ```',
  'invalid json',
  '',
  null,
  '{"title": "test", "summary": "test"}'
];

console.log('Testing cleanAndParseJSON utility:\n');

testCases.forEach((test, i) => {
  const result = cleanAndParseJSON(test);
  const isValid = validateJSONStructure(result, ['title', 'summary']);
  console.log(`Test ${i + 1}:`, {
    input: test?.substring(0, 30) + (test?.length > 30 ? '...' : ''),
    parsed: result,
    hasRequiredFields: isValid
  });
});