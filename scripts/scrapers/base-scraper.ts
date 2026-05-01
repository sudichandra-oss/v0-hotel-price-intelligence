import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import pRetry from 'p-retry';
import UserAgent from 'user-agents';

puppeteer.use(StealthPlugin());

export interface ScrapeParams {
  city: string;
  country: string;
  checkIn: Date;
  checkOut: Date;
}

export interface ScrapeResult {
  hotels: any[];
  source?: string;
  error?: string;
}

export abstract class BaseScraper {
  protected websiteName: string;

  constructor(websiteName: string) {
    this.websiteName = websiteName;
  }

  protected async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async getRandomDelay(min: number = 2000, max: number = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return this.delay(delay);
  }

  protected getBrowserOptions() {
    return {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--user-agent=' + new UserAgent().toString(),
      ],
    };
  }

  protected async launchBrowser() {
    return await puppeteer.launch(this.getBrowserOptions());
  }

  protected async fetchWithPuppeteer(url: string, waitSelector?: string) {
    const browser = await puppeteer.launch(this.getBrowserOptions());
    try {
      const page = await browser.newPage();
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Random viewport
      await page.setViewport({
        width: 1280 + Math.floor(Math.random() * 100),
        height: 720 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
      });

      console.log(`[${this.websiteName}] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      if (waitSelector) {
        await page.waitForSelector(waitSelector, { timeout: 30000 });
      }

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      await this.getRandomDelay(1000, 2000);

      const html = await page.content();
      return { html, browser, page };
    } catch (error: any) {
      await browser.close();
      throw error;
    }
  }

  protected parseWithCheerio(html: string) {
    return cheerio.load(html);
  }

  abstract scrape(params: { city: string; country: string; checkIn: Date; checkOut: Date }): Promise<ScrapeResult>;

  protected log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.websiteName}] [${level.toUpperCase()}] ${message}`);
  }
}
