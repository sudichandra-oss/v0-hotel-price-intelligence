import './scrapers/utils/polyfill';
import cron from 'node-cron';
import { BookingScraper } from './scrapers/booking-scraper';
import { MMTScraper } from './scrapers/makemytrips-scraper';
import { logScrape, updateScrapeLog } from './scrapers/utils/db-client';

// Cities to monitor
const monitorConfig = [
  { city: 'Mumbai', country: 'India', websites: ['booking', 'makemytrip'] },
  { city: 'Delhi', country: 'India', websites: ['booking', 'makemytrip'] },
  { city: 'London', country: 'UK', websites: ['booking'] },
];

async function runScheduledScrape() {
  console.log('Starting scheduled scrape job...');
  
  for (const config of monitorConfig) {
    for (const website of config.websites) {
      console.log(`Processing ${website} for ${config.city}...`);
      
      const log = await logScrape({
        website,
        city: config.city,
        country: config.country,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);

        const params = {
          city: config.city,
          country: config.country,
          checkIn: tomorrow,
          checkOut: dayAfter,
        };

        let result;
        if (website === 'booking') {
          const scraper = new BookingScraper();
          result = await scraper.scrape(params);
        } else if (website === 'makemytrip') {
          const scraper = new MMTScraper();
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
  console.log('Scheduled scrape job completed.');
}

// Schedule: Daily at 2:00 AM UTC
cron.schedule('0 2 * * *', () => {
  runScheduledScrape();
}, {
  timezone: "UTC"
});

console.log('Scheduler started. Jobs scheduled for 2:00 AM UTC.');

// Optional: Run immediately for testing if flag provided
if (process.argv.includes('--now')) {
  runScheduledScrape();
}
