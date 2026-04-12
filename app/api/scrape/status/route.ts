import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getMockDb } from '@/lib/mock-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const db = getMockDb();
      if (jobId) {
        const job = db.scrape_logs.find(l => l.id === jobId);
        return job ? NextResponse.json(job) : NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(db.scrape_logs.slice(-10).reverse());
    }

    if (!jobId) {
      // Return recent jobs
      const { data, error } = await supabase
        .from('scrape_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
