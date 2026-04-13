import { NextResponse } from 'next/server';
import { getMockDb } from '@/lib/mock-db';

export async function GET() {
  try {
    // Read directly from mock_db (real data written by the scheduler/scraper scripts)
    const db = getMockDb();
    const hotels: any[] = db.hotels || [];
    const rawLogs: any[] = db.scrape_logs || [];

    // Group hotels by city
    const cityMap: Record<string, {
      city: string; country: string; hotelCount: number;
      sources: Set<string>; lastScraped: string | null;
    }> = {};

    hotels.forEach((h: any) => {
      const key = (h.city || 'Unknown').toLowerCase();
      if (!cityMap[key]) {
        cityMap[key] = { city: h.city || 'Unknown', country: h.country || '', hotelCount: 0, sources: new Set(), lastScraped: null };
      }
      cityMap[key].hotelCount++;
      const src = h.source || h.website;
      if (src) cityMap[key].sources.add(src);
      const ts = h.scraped_at || h.created_at;
      if (ts && (!cityMap[key].lastScraped || ts > cityMap[key].lastScraped!)) {
        cityMap[key].lastScraped = ts;
      }
    });

    // Group logs by city
    const logsByCityMap: Record<string, any[]> = {};
    rawLogs.forEach((l: any) => {
      const k = (l.city || 'unknown').toLowerCase();
      if (!logsByCityMap[k]) logsByCityMap[k] = [];
      logsByCityMap[k].push({
        status:           l.status,
        website:          l.website,
        records_inserted: l.hotels_count || l.records_inserted || 0,
        started_at:       l.started_at,
        error_message:    l.error_message || null,
      });
    });

    const result = Object.values(cityMap)
      .sort((a, b) => b.hotelCount - a.hotelCount)
      .map(c => ({
        city: c.city,
        country: c.country,
        hotelCount: c.hotelCount,
        sources: Array.from(c.sources),
        lastScraped: c.lastScraped,
        jobs: (logsByCityMap[c.city.toLowerCase()] || [])
          .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
      }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
