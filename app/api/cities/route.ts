import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('*')
      .eq('active', true);
    if (citiesError) throw citiesError;

    const { data: hotelCounts } = await supabase.from('hotels').select('city, count').group('city');
    const { data: recentJobs } = await supabase.from('scrape_jobs').select('*').order('started_at', { ascending: false });
    const { data: citySources } = await supabase.from('hotels').select('city, source').distinct();

    const cityData = (cities || []).map((city: any) => {
      const count = hotelCounts?.find((h: any) => h.city === city.name)?.count || 0;
      const jobs = (recentJobs || []).filter((j: any) => j.city === city.name).slice(0, 10);
      const sources = [...new Set((citySources || []).filter((s: any) => s.city === city.name).map((s: any) => s.source))];

      return {
        city: city.name,
        country: city.country || 'India',
        hotelCount: count,
        sources: sources.length > 0 ? sources : ['booking', 'expedia'],
        lastScraped: jobs[0]?.completed_at || null,
        jobs: jobs.map((j: any) => ({
          status: j.status,
          website: j.website,
          records_inserted: j.records_inserted || 0,
          started_at: j.started_at,
        })),
      };
    });

    return NextResponse.json(cityData);
  } catch (error: any) {
    console.error('Cities data error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
