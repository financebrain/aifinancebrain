import { runWeightCheck } from '@/lib/decision-memory';

export async function GET() {
  try {
    const result = await runWeightCheck();

    return Response.json({
      dynamicWeights: result.dynamicWeights
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
