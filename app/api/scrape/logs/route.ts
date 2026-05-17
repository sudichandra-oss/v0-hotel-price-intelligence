import { NextRequest, NextResponse } from 'next/server';
import { getScrapeLog, getScrapStats } from '@/lib/scrape-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'logs'; // 'logs' or 'stats'
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type === 'stats') {
      // Return aggregated statistics
      const stats = getScrapStats();
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    }

    // Return scrape logs
    const logs = getScrapeLog();
    const sortedLogs = logs.sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    return NextResponse.json({
      success: true,
      total: sortedLogs.length,
      logs: sortedLogs.slice(0, limit),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[v0] Error fetching scrape logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
