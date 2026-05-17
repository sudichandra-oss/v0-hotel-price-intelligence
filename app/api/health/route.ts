import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const checks: any = {};
    let overallStatus = 'healthy';

    try {
      const { error } = await supabase.from('cities').select('count', { count: 'exact' }).limit(1);
      checks.database = { status: error ? 'error' : 'ok', message: error ? error.message : 'Connected' };
      if (error) overallStatus = 'unhealthy';
    } catch (e: any) {
      checks.database = { status: 'error', message: e.message };
      overallStatus = 'unhealthy';
    }

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: jobs } = await supabase.from('scrape_jobs').select('*').gte('started_at', yesterday);
      const totalJobs = jobs?.length || 0;
      const successJobs = jobs?.filter((j: any) => j.status === 'success').length || 0;
      const successRate = totalJobs > 0 ? (successJobs / totalJobs) * 100 : 0;

      checks.jobs = {
        status: successRate >= 70 ? 'ok' : successRate >= 50 ? 'warning' : 'error',
        total24h: totalJobs,
        successRate: `${successRate.toFixed(1)}%`,
      };
      if (successRate < 50) overallStatus = 'unhealthy';
      else if (successRate < 70 && overallStatus === 'healthy') overallStatus = 'degraded';
    } catch (e: any) {
      checks.jobs = { status: 'error', message: e.message };
    }

    try {
      const { data: latest } = await supabase.from('hotels').select('scraped_at').order('scraped_at', { ascending: false }).limit(1).single();
      const lastUpdate = latest?.scraped_at ? new Date(latest.scraped_at) : null;
      const hoursSinceUpdate = lastUpdate ? (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60) : Infinity;

      checks.dataFreshness = {
        status: hoursSinceUpdate < 12 ? 'ok' : hoursSinceUpdate < 24 ? 'warning' : 'error',
        lastUpdate: latest?.scraped_at || null,
        hoursSinceUpdate: hoursSinceUpdate === Infinity ? null : Math.round(hoursSinceUpdate * 10) / 10,
      };
      if (hoursSinceUpdate > 24 && overallStatus === 'healthy') overallStatus = 'degraded';
    } catch (e: any) {
      checks.dataFreshness = { status: 'error', message: e.message };
    }

    return NextResponse.json({ status: overallStatus, timestamp: new Date().toISOString(), checks });
  } catch (error: any) {
    return NextResponse.json({ status: 'unhealthy', error: error.message }, { status: 500 });
  }
}
