import { NextResponse } from 'next/server';

import supabase from '../../../lib/supabase.js';

export async function GET() {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Supabase insights error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: data || [],
  });
}
