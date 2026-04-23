import { runWeightCheck } from './lib/decision-memory.js';

(async () => {
  try {
    const result = await runWeightCheck();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
})();