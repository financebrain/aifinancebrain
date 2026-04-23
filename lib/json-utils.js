/**
 * Utility functions for parsing JSON responses from AI models
 */

/**
 * Safely parse JSON responses that may contain markdown code blocks
 * @param {string} rawResponse - Raw response string from AI model
 * @returns {object|null} - Parsed JSON object or null if parsing fails
 */
export function cleanAndParseJSON(rawResponse) {
  if (!rawResponse || typeof rawResponse !== 'string') {
    console.warn('cleanAndParseJSON: Invalid input, expected non-empty string');
    return null;
  }

  try {
    // First attempt: Clean and parse
    let cleaned = cleanJSONResponse(rawResponse);
    let parsed = JSON.parse(cleaned);

    // Validate that we got an object/array
    if (parsed !== null && typeof parsed === 'object') {
      return parsed;
    }

    throw new Error('Parsed result is not a valid JSON object/array');

  } catch (firstError) {
    console.warn('cleanAndParseJSON: First parse attempt failed:', firstError.message);

    try {
      // Second attempt: More aggressive cleaning
      let cleaned = cleanJSONResponse(rawResponse, true);
      let parsed = JSON.parse(cleaned);

      // Validate that we got an object/array
      if (parsed !== null && typeof parsed === 'object') {
        console.log('cleanAndParseJSON: Retry parsing succeeded');
        return parsed;
      }

      throw new Error('Retry parsed result is not a valid JSON object/array');

    } catch (secondError) {
      console.error('cleanAndParseJSON: Both parse attempts failed');
      console.error('Original response:', rawResponse.substring(0, 200) + '...');
      console.error('First error:', firstError.message);
      console.error('Second error:', secondError.message);
      return null;
    }
  }
}

/**
 * Clean JSON response by removing markdown code blocks and normalizing
 * @param {string} response - Raw response string
 * @param {boolean} aggressive - Use more aggressive cleaning (retry mode)
 * @returns {string} - Cleaned JSON string
 */
function cleanJSONResponse(response, aggressive = false) {
  let cleaned = response;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*$/gi, '');

  // Remove any remaining markdown markers
  cleaned = cleaned.replace(/```\w*\s*/gi, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  if (aggressive) {
    // More aggressive cleaning for retry
    // Remove any leading/trailing non-JSON characters
    cleaned = cleaned.replace(/^[^{[\s]*/, ''); // Remove everything before first { or [
    cleaned = cleaned.replace(/[^}\]\s]*$/, ''); // Remove everything after last } or ]

    // Remove any remaining non-printable characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Fix common JSON issues
    cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
    cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
  }

  return cleaned;
}

/**
 * Validate that a parsed JSON object has expected structure
 * @param {object} parsed - Parsed JSON object
 * @param {string[]} requiredFields - Array of required field names
 * @returns {boolean} - True if valid
 */
export function validateJSONStructure(parsed, requiredFields = []) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  // Check for required fields
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      console.warn(`validateJSONStructure: Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

/**
 * Safe JSON stringifier with error handling
 * @param {object} obj - Object to stringify
 * @returns {string|null} - JSON string or null if failed
 */
export function safeStringifyJSON(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.error('safeStringifyJSON: Failed to stringify object:', error.message);
    return null;
  }
}