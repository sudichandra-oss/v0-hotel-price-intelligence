import { NextRequest, NextResponse } from 'next/server';
import { BookingScraper } from '@/scripts/scrapers/booking-scraper';
import { MMTScraper } from '@/scripts/scrapers/makemytrips-scraper';
import { logScrape, updateScrapeLog } from '@/scripts/scrapers/utils/db-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { websites, cities, countries } = body;

    if (!websites || !cities) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize scrape log
    const logEntries = [];
    for (const website of websites) {
      for (const city of cities) {
        const log = await logScrape({
          website,
          city,
          country: countries?.[0] || 'Unknown',
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });
        if (log) logEntries.push(log);
      }
    }

    // Run scrapers in background (don't await them for the response)
    // In a real Vercel environment, this would need a background job or edge function
    (async () => {
      for (const log of logEntries) {
        try {
          let result;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dayAfter = new Date();
          dayAfter.setDate(dayAfter.getDate() + 2);

          const params = {
            city: log.city,
            country: log.country,
            checkIn: tomorrow,
            checkOut: dayAfter,
          };

          if (log.website === 'booking') {
            const scraper = new BookingScraper();
            result = await scraper.scrape(params);
          } else if (log.website === 'makemytrips') {
            const scraper = new MMTScraper();
            result = await scraper.scrape(params);
          }

          await updateScrapeLog(log.id, {
            status: result?.error ? 'failure' : 'success',
            hotels_count: result?.hotels?.length || 0,
            error_message: result?.error || null,
            finished_at: new Date().toISOString(),
          });
        } catch (err: any) {
          await updateScrapeLog(log.id, {
            status: 'failure',
            error_message: err.message,
            finished_at: new Date().toISOString(),
          });
        }
      }
    })();

    return NextResponse.json({
      message: 'Scraping started',
      job_ids: logEntries.map(l => l.id),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
