/**
 * Background Job Scheduler
 * Runs periodic scraping tasks without blocking user requests
 * Uses node-cron for scheduling
 */

import { setInCache, generateCacheKey } from './cache';

// Popular cities to scrape regularly
const POPULAR_CITIES = [
  { city: 'Mumbai', country: 'India' },
  { city: 'Delhi', country: 'India' },
  { city: 'Goa', country: 'India' },
  { city: 'Bangalore', country: 'India' },
  { city: 'London', country: 'UK' },
  { city: 'Paris', country: 'France' },
];

// Job tracking
let activeJobs: Map<string, { status: string; lastRun: Date }> = new Map();

/**
 * Register a background job
 */
export interface BackgroundJob {
  id: string;
  name: string;
  schedule: string; // cron expression
  execute: () => Promise<void>;
  enabled: boolean;
}

/**
 * Initialize background jobs
 * Call once at application startup
 */
export async function initializeBackgroundJobs() {
  console.log('[v0] Initializing background jobs...');

  // Only initialize in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_BACKGROUND_JOBS) {
    console.log('[v0] Background jobs disabled (set ENABLE_BACKGROUND_JOBS=true to enable)');
    return;
  }

  try {
    // This would use node-cron in production
    // For now, it's a placeholder that can be extended
    await setupScheduledScraping();
  } catch (error) {
    console.error('[v0] Failed to initialize background jobs:', error);
  }
}

/**
 * Setup periodic scraping of popular cities
 * Runs every 3 hours in production
 */
async function setupScheduledScraping() {
  const jobId = 'scrape-popular-cities';

  console.log('[v0] Setting up periodic scraping job');

  // Register job
  activeJobs.set(jobId, {
    status: 'scheduled',
    lastRun: new Date(),
  });

  // In production, integrate with node-cron or similar:
  // schedule('0 */3 * * *', async () => {
  //   await runScheduledScrape();
  // });

  console.log('[v0] Scheduled scraping job registered (would run every 3 hours in production)');
}

/**
 * Execute scheduled scraping
 */
async function runScheduledScrape() {
  const jobId = 'scrape-popular-cities';
  const job = activeJobs.get(jobId);

  if (!job) return;

  try {
    job.status = 'running';
    console.log('[v0] Starting scheduled scrape of popular cities');

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];

    // Scrape each popular city
    for (const { city, country } of POPULAR_CITIES) {
      try {
        console.log(`[v0] Scraping ${city} for cache warming...`);

        const response = await fetch(
          new URL('/api/scrape/live', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city,
              checkIn,
              checkOut,
              providers: ['Booking.com', 'Agoda', 'MakeMyTrip'],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Cache the results for 2 hours
          const cacheKey = generateCacheKey(city, checkIn, checkOut);
          await setInCache(cacheKey, data.hotels, 7200);

          console.log(
            `[v0] Cached ${data.hotels?.length || 0} hotels for ${city}`
          );
        } else {
          console.warn(`[v0] Failed to scrape ${city}: ${response.status}`);
        }
      } catch (error) {
        console.error(`[v0] Error scraping ${city}:`, error);
        // Continue with next city
      }

      // Stagger requests to avoid overwhelming servers
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    job.status = 'completed';
    job.lastRun = new Date();
    console.log('[v0] Scheduled scrape completed');
  } catch (error) {
    job.status = 'failed';
    console.error('[v0] Scheduled scrape failed:', error);
  }
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string) {
  return activeJobs.get(jobId) || null;
}

/**
 * Get all active jobs
 */
export function getAllJobs() {
  return Array.from(activeJobs.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
}

/**
 * Manually trigger scraping for a city
 * Useful for admin endpoints or manual cache warming
 */
export async function triggerCityScrape(
  city: string,
  checkIn: string,
  checkOut: string,
  ttlSeconds: number = 3600
): Promise<boolean> {
  try {
    console.log(`[v0] Manually triggering scrape for ${city}`);

    const response = await fetch(
      new URL('/api/scrape/live', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          checkIn,
          checkOut,
          providers: ['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia'],
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const cacheKey = generateCacheKey(city, checkIn, checkOut);
      await setInCache(cacheKey, data.hotels, ttlSeconds);

      console.log(`[v0] Successfully scraped and cached ${data.hotels?.length || 0} hotels`);
      return true;
    } else {
      console.warn(`[v0] Scrape failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[v0] Error triggering city scrape:', error);
    return false;
  }
}

/**
 * Get background job statistics
 */
export function getJobStats() {
  const jobs = getAllJobs();
  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status === 'running').length,
    failedJobs: jobs.filter((j) => j.status === 'failed').length,
    lastScrapeTimes: jobs.map((j) => ({
      job: j.id,
      lastRun: j.lastRun,
    })),
  };
}
