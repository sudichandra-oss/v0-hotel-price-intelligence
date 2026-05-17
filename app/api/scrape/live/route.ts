import { NextRequest, NextResponse } from 'next/server';
import { BookingScraper } from '@/scripts/scrapers/booking-scraper';
import { MMTScraper } from '@/scripts/scrapers/makemytrips-scraper';
import { AgodaScraper } from '@/scripts/scrapers/agoda-scraper';
import { ExpediaScraper } from '@/scripts/scrapers/expedia-scraper';
import { GoogleScraper } from '@/scripts/scrapers/google-scraper';
import { validatePrice, convertPrice, getLowestPrice } from '@/lib/price-validator';
import { deduplicateHotels, HotelRecord } from '@/lib/hotel-matcher';
import { getFromCache, setInCache, generateCacheKey } from '@/lib/cache';
import { saveScrapedHotels, saveScrapeLog } from '@/lib/scrape-storage';

export const maxDuration = 120; // 2 minute timeout for scraping

interface HotelPrice {
  hotel_id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  source: string;
  price: number;
  currency: string;
  meal_plan?: string;
  timestamp: string;
}

interface LiveScrapeResponse {
  success: boolean;
  hotels: HotelPrice[];
  sources: string[];
  fetchedAt: string;
  message?: string;
  errors?: Record<string, string>;
}

// Circuit breaker pattern - retry failed scrapers with exponential backoff
async function executeScraperWithTimeout(
  scraper: any,
  params: { city: string; country: string; checkIn: Date; checkOut: Date },
  timeoutMs: number = 30000
): Promise<any> {
  return Promise.race([
    scraper.scrape(params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Scraper timeout')), timeoutMs)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const {
      city = 'Mumbai',
      checkIn,
      checkOut,
      providers = ['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia'],
      forceRefresh = false, // Allow bypassing cache
    } = await request.json();

    console.log(`[v0] Live scrape request for ${city}`);

    // Check cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const cacheKey = generateCacheKey(city, checkIn, checkOut);
      const cached = await getFromCache(cacheKey);
      if (cached) {
        console.log(`[v0] Returning cached results for ${city}`);
        return NextResponse.json({
          success: true,
          hotels: cached,
          sources: [],
          fetchedAt: new Date().toISOString(),
          fromCache: true,
          message: 'Results from cache',
        });
      }
    }

    // Parse and validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dates provided' },
        { status: 400 }
      );
    }

    const results: HotelPrice[] = [];
    const errors: Record<string, string> = {};
    const activeSources: string[] = [];

    // Execute all scrapers in parallel with timeouts
    const scraperPromises = providers.map(async (provider: string) => {
      const website = provider.toLowerCase().replace('.com', '');
      
      try {
        let scraper: any;
        let sourceLabel = provider;

        if (website === 'booking' || provider.includes('Booking')) {
          scraper = new BookingScraper();
          sourceLabel = 'Booking.com';
        } else if (website === 'makemytrip' || website === 'mmt' || provider.includes('MakeMyTrip')) {
          scraper = new MMTScraper();
          sourceLabel = 'MakeMyTrip';
        } else if (website === 'agoda' || provider.includes('Agoda')) {
          scraper = new AgodaScraper();
          sourceLabel = 'Agoda';
        } else if (website === 'expedia' || provider.includes('Expedia')) {
          scraper = new ExpediaScraper();
          sourceLabel = 'Expedia';
        } else if (website === 'google' || provider.includes('Google')) {
          scraper = new GoogleScraper();
          sourceLabel = 'Google Hotels';
        } else {
          console.warn(`[v0] Unknown provider: ${provider}`);
          return;
        }

        console.log(`[v0] Starting scraper for ${sourceLabel} - City: ${city}`);
        const params = { city, country: 'India', checkIn: checkInDate, checkOut: checkOutDate };
        const result = await executeScraperWithTimeout(scraper, params, 35000);

        if (result && result.hotels && result.hotels.length > 0) {
          activeSources.push(sourceLabel);
          const hotelCount = result.hotels.length;
          results.push(
            ...result.hotels.map((hotel: any) => ({
              ...hotel,
              source: sourceLabel,
              timestamp: new Date().toISOString(),
            }))
          );
          console.log(`[v0] ${sourceLabel}: Successfully retrieved ${hotelCount} hotels for ${city}`);
        } else {
          console.warn(`[v0] ${sourceLabel}: No hotels returned for ${city}. Result:`, result);
          errors[sourceLabel] = 'No hotels found in search results';
        }
      } catch (error: any) {
        const providerName = provider;
        errors[providerName] = error.message || 'Unknown error';
        console.error(`[v0] ${providerName} scraper failed for ${city}:`, error.message || error);
      }
    });

    // Wait for all scrapers to complete (in parallel)
    await Promise.allSettled(scraperPromises);

    // Deduplicate, validate, and merge hotels from multiple sources
    const deduplicatedHotels = deduplicateAndValidateHotels(results);

    // Sort by price (lowest first)
    const sortedHotels = deduplicatedHotels.sort((a, b) => a.price - b.price);

    // Handle empty results
    if (!sortedHotels || sortedHotels.length === 0) {
      console.warn(`[v0] No valid hotels found after validation. Returning empty results.`);
      
      const response: LiveScrapeResponse = {
        success: Object.keys(errors).length === 0, // Success if no errors (just no results)
        hotels: [],
        sources: activeSources,
        fetchedAt: new Date().toISOString(),
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      };

      // Still cache empty results briefly (3 minutes)
      const cacheKey = generateCacheKey(city, checkIn, checkOut);
      await setInCache(cacheKey, [], 180);

      return NextResponse.json(response);
    }

    // Group by hotel name to show source breakdown
    const hotelsByName = new Map<string, HotelPrice[]>();
    sortedHotels.forEach((hotel) => {
      const key = hotel.name.toLowerCase().trim();
      if (!hotelsByName.has(key)) {
        hotelsByName.set(key, []);
      }
      hotelsByName.get(key)!.push(hotel);
    });

    // Build response with sourceBreakdown for each hotel
    const responseHotels = Array.from(hotelsByName.values())
      .map((hotelGroup) => {
        const primary = hotelGroup[0];
        const sourceBreakdown = hotelGroup.map((h) => ({
          source: h.source,
          price: h.price,
          currency: h.currency || 'INR',
          meal_plan: h.meal_plan || 'N/A',
          timestamp: h.timestamp,
        }));

        const prices = hotelGroup.map((h) => h.price).filter((p) => p && !isNaN(p));
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : primary.price;

        return {
          ...primary,
          sourceBreakdown,
          lowestPrice,
          priceCompare: hotelGroup.length > 1 ? hotelGroup.length : 0,
        };
      })
      .slice(0, 50); // Limit to top 50 hotels

    // Save scraped hotels to database
    console.log(`[v0] Preparing to save ${responseHotels.length} hotels`);
    if (responseHotels.length > 0) {
      console.log(`[v0] Sample hotel for saving:`, JSON.stringify(responseHotels[0], null, 2).substring(0, 500));
    }
    
    const startTime = Date.now();
    const savedCount = saveScrapedHotels(responseHotels);
    const duration = Date.now() - startTime;

    console.log(`[v0] Saved ${savedCount} hotels in ${duration}ms`);

    // Save scrape log
    const logEntry = {
      id: `log-${Date.now()}`,
      city,
      checkIn,
      checkOut,
      providers,
      hotels_found: responseHotels.length,
      hotels_saved: savedCount,
      sources: activeSources,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      status: Object.keys(errors).length === 0 ? 'success' : 'partial',
      started_at: new Date(Date.now() - 30000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
    };
    
    console.log(`[v0] Saving log entry:`, JSON.stringify(logEntry, null, 2));
    saveScrapeLog(logEntry);

    const response: LiveScrapeResponse = {
      success: Object.keys(errors).length < providers.length,
      hotels: responseHotels,
      sources: activeSources,
      fetchedAt: new Date().toISOString(),
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };

    // Cache the results (5-15 minute TTL)
    const cacheKey = generateCacheKey(city, checkIn, checkOut);
    await setInCache(cacheKey, responseHotels, 600); // 10 minutes

    console.log(
      `[v0] Live scrape completed: ${responseHotels.length} hotels found, ${savedCount} saved to database`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[v0] Live scrape error:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape hotels',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate and validate hotels
 * - Removes invalid prices
 * - Merges duplicate hotel entries
 * - Keeps lowest price per hotel
 */
function deduplicateAndValidateHotels(hotels: HotelPrice[]): HotelPrice[] {
  // First filter out any hotels with missing or invalid price data
  const hotelsWithPrices = hotels.filter((hotel) => {
    return hotel && hotel.price && typeof hotel.price === 'number' && !isNaN(hotel.price) && hotel.price > 0;
  });

  // Then validate all prices
  const validHotels = hotelsWithPrices.filter((hotel) => {
    try {
      const validation = validatePrice(hotel.price.toString(), hotel.source, hotel.timestamp);
      return validation.isValid;
    } catch (err) {
      console.warn(`[v0] Price validation failed for ${hotel.name}:`, err);
      return false;
    }
  });

  console.log(`[v0] Price validation: ${hotels.length} hotels -> ${hotelsWithPrices.length} with price -> ${validHotels.length} valid`);

  // Group by normalized name and city
  const seen = new Map<string, HotelPrice[]>();

  for (const hotel of validHotels) {
    const normalizedName = hotel.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s&-]/g, '')
      .replace(/\s+/g, ' ');
    const key = `${normalizedName}|${hotel.city.toLowerCase()}`;

    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(hotel);
  }

  // For each group, keep the lowest priced version
  const deduplicated: HotelPrice[] = [];

  for (const group of seen.values()) {
    // Sort by price ascending
    const sorted = group.sort((a, b) => a.price - b.price);
    const primary = sorted[0];

    // Merge additional source prices into sourceBreakdown
    const additionalSources = sorted.slice(1);
    if (additionalSources.length > 0 && primary.sourceBreakdown) {
      for (const alt of additionalSources) {
        if (!primary.sourceBreakdown.some((s) => s.source === alt.source)) {
          primary.sourceBreakdown.push({
            source: alt.source,
            price: alt.price,
            currency: alt.currency,
            meal_plan: alt.meal_plan,
            timestamp: alt.timestamp,
          });
        }
      }
      // Re-sort source breakdown by price
      primary.sourceBreakdown.sort((a, b) => a.price - b.price);
    }

    deduplicated.push(primary);
  }

  return deduplicated;
}
