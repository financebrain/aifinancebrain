import { NextResponse } from 'next/server';

import supabase from '../../../lib/supabase.js';

export async function GET() {
  const { data: latestData, error: latestError } = await supabase
    .from('insights')
    .select('run_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (latestError) {
    console.error('Supabase latest run_id error:', latestError);
    return NextResponse.json(
      { success: false, error: latestError.message },
      { status: 500 },
    );
  }

  if (!latestData || latestData.length === 0 || !latestData[0].run_id) {
    return NextResponse.json({
      success: true,
      data: [],
    });
  }

  const runId = latestData[0].run_id;

  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase insights fetching error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  const typeMap = new Map();
  for (const item of (data || [])) {
    if (!typeMap.has(item.type)) {
      typeMap.set(item.type, item);
    }
  }

  const uniqueInsights = Array.from(typeMap.values());

  return NextResponse.json({
    success: true,
    data: uniqueInsights,
  });
}
