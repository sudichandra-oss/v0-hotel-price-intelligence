import { NextRequest, NextResponse } from 'next/server';
import { getMockDb } from '@/lib/mock-db';

export async function GET(_request: NextRequest) {
  try {
    const db = getMockDb();
    const rawLogs: any[] = db.scrape_logs || [];

    if (rawLogs.length === 0) {
      return NextResponse.json({ progress: 0, total: 0, completed: 0, latest: null, logs: [] });
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Try last 2h window
    let batch = rawLogs.filter(l => (l.started_at || '') >= twoHoursAgo);

    // If empty, use the latest session (within 30 min of most-recent log)
    if (batch.length === 0) {
      const latestTs = rawLogs.reduce(
        (a, b) => ((a.started_at || '') > (b.started_at || '') ? a : b)
      ).started_at;
      const batchCutoff = new Date(new Date(latestTs).getTime() - 30 * 60 * 1000).toISOString();
      batch = rawLogs.filter(l => (l.started_at || '') >= batchCutoff);
    }

    const logs = batch
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 100)
      .map(l => ({
        id:               l.id,
        city:             l.city,
        website:          l.website,
        status:           l.status,
        records_inserted: l.hotels_count || l.records_inserted || 0,
        started_at:       l.started_at,
        completed_at:     l.finished_at || l.completed_at || null,
        error_message:    l.error_message || null,
      }));

    const total      = batch.length;
    const completed  = batch.filter(l => l.status === 'success' || l.status === 'failure').length;
    const inProgress = batch.filter(l => l.status === 'in_progress').length;
    const progress   = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({ progress, total, completed, inProgress, latest: logs[0] || null, logs });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
