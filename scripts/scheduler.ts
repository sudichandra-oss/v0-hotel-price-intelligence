import './scrapers/utils/polyfill';
import cron from 'node-cron';
import { BookingScraper } from './scrapers/booking-scraper';
import { MMTScraper } from './scrapers/makemytrips-scraper';
import { AgodaScraper } from './scrapers/agoda-scraper';
import { ExpediaScraper } from './scrapers/expedia-scraper';
import { logScrape, updateScrapeLog } from './scrapers/utils/db-client';

// Cities to monitor with expanded intelligence sources
const monitorConfig = [
  { city: 'Mumbai', country: 'India', websites: ['booking', 'makemytrip', 'agoda', 'expedia'] },
  { city: 'Goa', country: 'India', websites: ['booking', 'makemytrip', 'agoda', 'expedia'] },
  { city: 'Delhi', country: 'India', websites: ['booking', 'makemytrip', 'agoda', 'expedia'] },
  { city: 'Bangalore', country: 'India', websites: ['booking', 'makemytrip', 'agoda', 'expedia'] },
  { city: 'Dubai', country: 'UAE', websites: ['booking', 'agoda', 'expedia'] },
];

async function runScheduledScrape(daysToScrape: number = 14) {
  console.log(`Starting scheduled scrape job for next ${daysToScrape} days...`);
  
  for (const config of monitorConfig) {
    for (const website of config.websites) {
      console.log(`Processing ${website} for ${config.city}...`);
      
      // Focus hourly runs on high-velocity windows (e.g., next 14 days)
      const targetOffsets = [1, 2, 3, 5, 7, 10, 14].filter(d => d <= daysToScrape);

      for (const offset of targetOffsets) {
        const log = await logScrape({
          website,
          city: config.city,
          country: config.country,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          metadata: { offset_days: offset }
        });

        try {
          const checkIn = new Date();
          checkIn.setDate(checkIn.getDate() + offset);
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkIn.getDate() + 1);

          console.log(`  > Scraping for date: ${checkIn.toISOString().split('T')[0]}`);

          const params = {
            city: config.city,
            country: config.country,
            checkIn,
            checkOut,
          };

          let result;
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
          }

          if (log) {
            await updateScrapeLog(log.id, {
              status: result?.error ? 'failure' : 'success',
              hotels_count: result?.hotels?.length || 0,
              error_message: result?.error || null,
              finished_at: new Date().toISOString(),
            });
          }
          
          // Moderate delay between date requests to avoid blocking
          await new Promise(r => setTimeout(r, 1500));
          
        } catch (err: any) {
          if (log) {
            await updateScrapeLog(log.id, {
              status: 'failure',
              error_message: err.message,
              finished_at: new Date().toISOString(),
            });
          }
        }
      }
    }
  }
  console.log('Scheduled scrape full pass completed.');
}

// Schedule: EVERY HOUR on the hour
cron.schedule('0 * * * *', () => {
  runScheduledScrape(14); // Hourly intelligence pulse for next 14 days
});

console.log('Scheduler started. Jobs scheduled for every HOUR.');

if (process.argv.includes('--now')) {
  runScheduledScrape();
}
