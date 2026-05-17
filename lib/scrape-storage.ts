import { getMockDb, saveMockDb } from './mock-db';
import { v4 as uuidv4 } from 'uuid';

export interface ScrapedHotel {
  id?: string;
  hotel_id: string;
  name: string;
  city: string;
  country: string;
  price: number;
  source: string;
  sourceBreakdown?: Array<{
    source: string;
    price: number;
    currency?: string;
    meal_plan?: string;
    timestamp?: string;
  }>;
  rating?: number;
  review_count?: number;
  star_category?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  amenities?: string[];
  meal_plan?: string;
  currency?: string;
  timestamp?: string;
}

export interface ScrapeLog {
  id: string;
  city: string;
  checkIn: string;
  checkOut: string;
  providers: string[];
  hotels_found: number;
  hotels_saved: number;
  sources: string[];
  errors?: Record<string, string>;
  status: 'success' | 'partial' | 'failed';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  fromCache?: boolean;
}

/**
 * Save scraped hotels to mock database
 * Prevents duplicates by checking hotel_id
 */
export function saveScrapedHotels(hotels: ScrapedHotel[]): number {
  try {
    const db = getMockDb();

    if (!db.hotels) db.hotels = [];
    if (!db.price_history) db.price_history = [];

    let savedCount = 0;

    for (const hotel of hotels) {
      // Check if hotel already exists
      const existingIndex = db.hotels.findIndex(
        (h: any) => h.hotel_id === hotel.hotel_id && h.city.toLowerCase() === hotel.city.toLowerCase()
      );

      const now = new Date().toISOString();
      const hotelId = hotel.id || `scraped-${uuidv4()}`;

      if (existingIndex >= 0) {
        // Update existing hotel
        db.hotels[existingIndex] = {
          ...db.hotels[existingIndex],
          ...hotel,
          id: hotelId,
          updated_at: now,
        };
      } else {
        // Add new hotel
        db.hotels.push({
          ...hotel,
          id: hotelId,
          created_at: now,
          updated_at: now,
        });
      }

      // Also save price history for tracking
      if (hotel.sourceBreakdown) {
        for (const sourcePrice of hotel.sourceBreakdown) {
          db.price_history.push({
            id: `price-${uuidv4()}`,
            hotel_id: hotel.hotel_id,
            room_type_id: null,
            stay_date: new Date().toISOString().split('T')[0],
            price: sourcePrice.price,
            currency: sourcePrice.currency || 'INR',
            source: sourcePrice.source,
            checkin_date: '', // Would come from request
            checkout_date: '', // Would come from request
            scraped_at: now,
            created_at: now,
          });
        }
      } else {
        // Save single price as history
        db.price_history.push({
          id: `price-${uuidv4()}`,
          hotel_id: hotel.hotel_id,
          room_type_id: null,
          stay_date: new Date().toISOString().split('T')[0],
          price: hotel.price,
          currency: hotel.currency || 'INR',
          source: hotel.source,
          checkin_date: '',
          checkout_date: '',
          scraped_at: now,
          created_at: now,
        });
      }

      savedCount++;
    }

    saveMockDb(db);
    console.log(`[v0] Saved ${savedCount} hotels to mock database`);
    return savedCount;
  } catch (error: any) {
    console.error('[v0] Error saving hotels:', error);
    return 0;
  }
}

/**
 * Save scrape log/activity record
 */
export function saveScrapeLog(log: ScrapeLog): void {
  try {
    const db = getMockDb();

    if (!db.scrape_logs) db.scrape_logs = [];

    db.scrape_logs.push(log);

    // Keep only last 500 logs to prevent file from growing too large
    if (db.scrape_logs.length > 500) {
      db.scrape_logs = db.scrape_logs.slice(-500);
    }

    saveMockDb(db);
    console.log(`[v0] Saved scrape log for city: ${log.city}`);
  } catch (error: any) {
    console.error('[v0] Error saving scrape log:', error);
  }
}

/**
 * Get all scrape logs
 */
export function getScrapeLog(): ScrapeLog[] {
  try {
    const db = getMockDb();
    return db.scrape_logs || [];
  } catch (error: any) {
    console.error('[v0] Error reading scrape logs:', error);
    return [];
  }
}

/**
 * Get scrape stats
 */
export function getScrapStats() {
  try {
    const db = getMockDb();
    const logs = db.scrape_logs || [];
    const hotels = db.hotels || [];
    const priceHistory = db.price_history || [];

    // Calculate stats, handling null/undefined values
    const totalScraped = logs.reduce((sum, log) => {
      const found = log.hotels_found || 0;
      return sum + (typeof found === 'number' ? found : 0);
    }, 0);

    const totalSaved = logs.reduce((sum, log) => {
      const saved = log.hotels_saved || 0;
      return sum + (typeof saved === 'number' ? saved : 0);
    }, 0);

    const successfulScrapers = logs.filter((log) => log.status === 'success').length;
    const partialScrapers = logs.filter((log) => log.status === 'partial').length;
    const failedScrapers = logs.filter((log) => log.status === 'failed').length;

    // Get unique cities scraped, handling null cities
    const uniqueCities = new Set(
      logs
        .map((log) => log.city?.toLowerCase())
        .filter((city) => city !== null && city !== undefined)
    ).size;

    // Get last 24 hours activity
    const last24h = new Date(Date.now() - 86400000);
    const last24hLogs = logs.filter((log) => {
      try {
        return log.completed_at && new Date(log.completed_at) > last24h;
      } catch {
        return false;
      }
    });
    const last24hScraped = last24hLogs.reduce((sum, log) => {
      const found = log.hotels_found || 0;
      return sum + (typeof found === 'number' ? found : 0);
    }, 0);

    // Get last scrape time (most recent successful or any log)
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
    const lastScrapeTime = lastLog?.completed_at ? lastLog.completed_at : null;

    return {
      totalScraped,
      totalSaved,
      totalHotels: hotels.length,
      totalPriceRecords: priceHistory.length,
      successfulScrapers,
      partialScrapers,
      failedScrapers,
      uniqueCities,
      last24hScraped,
      totalScrapeLogs: logs.length,
      lastScrapeTime,
    };
  } catch (error: any) {
    console.error('[v0] Error getting scrape stats:', error);
    // Return default empty stats instead of null
    return {
      totalScraped: 0,
      totalSaved: 0,
      totalHotels: 0,
      totalPriceRecords: 0,
      successfulScrapers: 0,
      partialScrapers: 0,
      failedScrapers: 0,
      uniqueCities: 0,
      last24hScraped: 0,
      totalScrapeLogs: 0,
      lastScrapeTime: null,
    };
  }
}

/**
 * Get hotels scraped for a specific city
 */
export function getHotelsForCity(city: string) {
  try {
    const db = getMockDb();
    const hotels = db.hotels || [];
    return hotels.filter((h: any) => h.city.toLowerCase() === city.toLowerCase());
  } catch (error: any) {
    console.error('[v0] Error getting hotels for city:', error);
    return [];
  }
}

/**
 * Get price history for a hotel
 */
export function getPriceHistoryForHotel(hotelId: string) {
  try {
    const db = getMockDb();
    const history = db.price_history || [];
    return history
      .filter((h: any) => h.hotel_id === hotelId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100); // Last 100 records
  } catch (error: any) {
    console.error('[v0] Error getting price history:', error);
    return [];
  }
}

/**
 * Clear old logs and data (for maintenance)
 */
export function clearOldData(daysToKeep: number = 30): number {
  try {
    const db = getMockDb();
    const cutoffDate = new Date(Date.now() - daysToKeep * 86400000);

    let removed = 0;

    // Clear old price history
    if (db.price_history) {
      const initialLength = db.price_history.length;
      db.price_history = db.price_history.filter(
        (h: any) => new Date(h.created_at) > cutoffDate
      );
      removed += initialLength - db.price_history.length;
    }

    // Clear old scrape logs
    if (db.scrape_logs) {
      const initialLength = db.scrape_logs.length;
      db.scrape_logs = db.scrape_logs.filter((log: any) => new Date(log.completed_at) > cutoffDate);
      removed += initialLength - db.scrape_logs.length;
    }

    saveMockDb(db);
    console.log(`[v0] Cleared ${removed} old records`);
    return removed;
  } catch (error: any) {
    console.error('[v0] Error clearing old data:', error);
    return 0;
  }
}
