import { runSystem } from '@/lib/system.js';

export async function POST(request) {
  try {
    const input = await request.json();
    const result = await runSystem(input, 'trading');

    return Response.json(result);
  } catch (error) {
    console.error('Trading API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}