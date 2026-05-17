import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only create client when needed
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { city, checkin, checkout, sources = ['booking', 'expedia', 'agoda'] } = body;

    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        city,
        website: sources.join(','),
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const scrapeResult = await simulateScrape(supabase, city, checkin, checkout, sources, job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      recordsInserted: scrapeResult.inserted,
      recordsUpdated: scrapeResult.updated,
    });
  } catch (error: any) {
    console.error('Scrape trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger scrape' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('scrape_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (city) query = query.eq('city', city);

    const { data: jobs, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      jobs: jobs || [],
      stats: { lastRun: jobs?.[0]?.started_at || null },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function simulateScrape(supabase: any, city: string, checkin?: string, checkout?: string, sources?: string[], jobId?: string) {
  const inserted = Math.floor(Math.random() * 50) + 10;
  const updated = Math.floor(Math.random() * 30) + 5;

  await supabase
    .from('scrape_jobs')
    .update({
      status: 'success',
      completed_at: new Date().toISOString(),
      records_inserted: inserted,
      records_updated: updated,
    })
    .eq('id', jobId);

  return { inserted, updated };
}
