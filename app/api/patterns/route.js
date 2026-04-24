import { getSignalPatterns } from '@/lib/decision-memory';

export async function GET() {
  try {
    const patterns = await getSignalPatterns();
    return Response.json(patterns);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
