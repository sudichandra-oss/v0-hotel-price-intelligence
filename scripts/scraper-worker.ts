#!/usr/bin/env node

/**
 * Scraper Worker
 * This script runs independently and processes queued scrape jobs using real Puppeteer scraping.
 * Run this separately from the Next.js dev server: npx ts-node scripts/scraper-worker.ts
 */

import './scrapers/utils/polyfill';
import { getPendingJobs, updateJobStatus } from '@/lib/scraper-queue';
import { BookingScraper } from './scrapers/booking-scraper';
import { MMTScraper } from './scrapers/makemytrips-scraper';
import { AgodaScraper } from './scrapers/agoda-scraper';
import { ExpediaScraper } from './scrapers/expedia-scraper';

const POLL_INTERVAL = 5000; // Check for new jobs every 5 seconds

async function processScrapeJob(jobId: string, city: string, country: string, startDate: string, endDate: string, providers: string[]) {
  console.log(`\n[Worker] Processing job ${jobId} for ${city}`);
  
  // Mark job as running
  updateJobStatus(jobId, 'running', { startedAt: new Date().toISOString() });

  let totalHotels = 0;
  let hasErrors = false;

  for (const provider of providers) {
    const website = provider.toLowerCase().replace('.com', '');
    
    try {
      console.log(`[Worker] Scraping ${website} for ${city}...`);
      
      const checkIn = new Date(startDate);
      const checkOut = new Date(endDate);

      const params = { city, country, checkIn, checkOut };
      let result;

      // Use real Puppeteer scrapers
      if (website === 'booking') {
        const scraper = new BookingScraper();
        result = await scraper.scrape(params);
      } else if (website === 'makemytrip') {
        const scraper = new MMTScraper();
        result = await scraper.scrape(params);
      } else if (website === 'agoda') {
        const scraper = new AgodaScraper();
        result = await scraper.scrape(params);
      } else if (website === 'expedia') {
        const scraper = new ExpediaScraper();
        result = await scraper.scrape(params);
      } else {
        console.log(`[Worker] Unknown provider: ${website}`);
        continue;
      }

      const hotelCount = result?.hotels?.length || 0;
      totalHotels += hotelCount;
      console.log(`[Worker] ✓ ${website}: scraped ${hotelCount} hotels`);

      if (result?.error) {
        hasErrors = true;
        console.error(`[Worker] ✗ ${website}: ${result.error}`);
      }
    } catch (err: any) {
      hasErrors = true;
      console.error(`[Worker] ✗ Error scraping ${website}: ${err.message}`);
    }
  }

  // Mark job as completed or failed
  const status = hasErrors ? 'failed' : 'completed';
  updateJobStatus(jobId, status, { 
    completedAt: new Date().toISOString(),
    hotelsScraped: totalHotels,
    error: hasErrors ? 'One or more providers failed' : undefined
  });

  console.log(`[Worker] Job ${jobId} ${status} - ${totalHotels} hotels scraped`);
}

async function workerLoop() {
  console.log('[Worker] Scraper worker started. Waiting for jobs...');

  setInterval(async () => {
    try {
      const pendingJobs = getPendingJobs();
      
      if (pendingJobs.length > 0) {
        console.log(`[Worker] Found ${pendingJobs.length} pending job(s)`);
        
        // Process jobs one at a time
        for (const job of pendingJobs) {
          await processScrapeJob(job.id, job.city, job.country, job.startDate, job.endDate, job.providers);
          
          // Delay between jobs to avoid overwhelming the system
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (err: any) {
      console.error('[Worker] Error in worker loop:', err.message);
    }
  }, POLL_INTERVAL);
}

// Start the worker
workerLoop().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
