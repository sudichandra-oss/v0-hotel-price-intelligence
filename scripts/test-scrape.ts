#!/usr/bin/env node

/**
 * Test script to verify scraping functionality
 * Run with: npx ts-node scripts/test-scrape.ts
 */

import './scrapers/utils/polyfill';
import { BookingScraper } from './scrapers/booking-scraper';
import { AgodaScraper } from './scrapers/agoda-scraper';
import { ExpediaScraper } from './scrapers/expedia-scraper';
import { MMTScraper } from './scrapers/makemytrips-scraper';
import { logScrape, updateScrapeLog } from './scrapers/utils/db-client';

async function testScraper(scraperName: string, scraperClass: any) {
  console.log(`\n[TEST] Starting ${scraperName} test...`);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  try {
    // Create a log entry
    const log = await logScrape({
      website: scraperName.toLowerCase(),
      city: 'Mumbai',
      country: 'India',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      metadata: { test: true }
    });
    console.log(`[TEST] Created scrape log with ID: ${log?.id}`);

    // Run scraper
    const scraper = new scraperClass();
    const result = await scraper.scrape({
      city: 'Mumbai',
      country: 'India',
      checkIn: tomorrow,
      checkOut: dayAfter,
    });

    console.log(`[TEST] ✓ ${scraperName} scraped ${result.hotels?.length || 0} hotels`);
    if (result.error) {
      console.log(`[TEST] ✗ Error: ${result.error}`);
    }

    // Update log
    if (log) {
      await updateScrapeLog(log.id, {
        status: result.error ? 'failure' : 'success',
        hotels_count: result.hotels?.length || 0,
        error_message: result.error || null,
        finished_at: new Date().toISOString(),
      });
      console.log(`[TEST] Updated scrape log to status: ${result.error ? 'failure' : 'success'}`);
    }

    return true;
  } catch (error: any) {
    console.error(`[TEST] ✗ ${scraperName} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Hotel Price Scraper - Test Suite');
  console.log('='.repeat(60));

  const scrapers = [
    ['Booking.com', BookingScraper],
    ['Agoda', AgodaScraper],
    ['Expedia', ExpediaScraper],
    ['MakeMyTrip', MMTScraper],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, ScraperClass] of scrapers) {
    const result = await testScraper(name, ScraperClass);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // Add delay between scrapers to avoid overwhelming the system
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[TEST] Fatal error:', error);
  process.exit(1);
});
