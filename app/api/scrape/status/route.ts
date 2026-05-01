import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/scraper-queue';

export async function GET(_request: NextRequest) {
  try {
    const jobs = getAllJobs();
    
    if (jobs.length === 0) {
      return NextResponse.json({ progress: 0, total: 0, completed: 0, latest: null, logs: [] });
    }

    // Get jobs from the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    let recentJobs = jobs.filter(j => j.createdAt >= twoHoursAgo);

    // If no recent jobs, use all jobs
    if (recentJobs.length === 0) {
      recentJobs = jobs;
    }

    // Sort by creation time, newest first
    const sortedJobs = recentJobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate progress
    const total = sortedJobs.length;
    const completed = sortedJobs.filter(j => j.status === 'completed' || j.status === 'failed').length;
    const running = sortedJobs.filter(j => j.status === 'running').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Format logs for UI
    const logs = sortedJobs.slice(0, 50).map(j => ({
      id: j.id,
      city: j.city,
      website: j.providers?.[0] || 'multiple',
      status: j.status === 'pending' ? 'in_progress' : j.status,
      records_inserted: j.hotelsScraped || 0,
      started_at: j.startedAt || j.createdAt,
      completed_at: j.completedAt || null,
      error_message: j.error || null,
    }));

    return NextResponse.json({ 
      progress, 
      total, 
      completed, 
      running,
      latest: logs[0] || null, 
      logs 
    });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
