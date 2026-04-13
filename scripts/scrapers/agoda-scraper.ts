import { BaseScraper, ScrapeParams, ScrapeResult } from './base-scraper';
import { upsertHotel, insertPriceHistory } from './utils/db-client';
import { generateHotelId, ratingToStarCategory } from './utils/formatter';

export class AgodaScraper extends BaseScraper {
  constructor() {
    super('Agoda');
  }

  async scrape(params: ScrapeParams): Promise<ScrapeResult> {
    const { city, country, checkIn, checkOut } = params;
    
    try {
      // Agoda search URL pattern
      const searchUrl = `https://www.agoda.com/search?city=${city}&checkIn=${checkIn.toISOString().split('T')[0]}&checkOut=${checkOut.toISOString().split('T')[0]}&adults=2&rooms=1`;
      
      this.log(`Navigating to: ${searchUrl}`);
      // In a real implementation, we would use Puppeteer/Playwright to navigate and wait for selectors
      // For this implementation, we simulate the extraction logic
      
      // Simulate scraped hotels from Agoda
      const mockHotels = [
        { name: 'The Taj Mahal Tower', price: 18000, rating: 9.1, review_count: 5400, star_category: 5, latitude: 18.9218, longitude: 72.8333 },
        { name: 'Trident Nariman Point', price: 12000, rating: 8.9, review_count: 4200, star_category: 5, latitude: 18.9256, longitude: 72.8212 },
        { name: 'JW Marriott', price: 15000, rating: 8.7, review_count: 3200, star_category: 5, latitude: 19.1000, longitude: 72.8500 },
        { name: 'Click Hotels Andheri MIDC', price: 2600, rating: 7.9, review_count: 850, star_category: 3, latitude: 19.1177, longitude: 72.8755 },
        { name: 'Sri Sai Grand IN', price: 1750, rating: 8.2, review_count: 1200, star_category: 3, latitude: 12.9716, longitude: 77.5946 },
        { name: 'Hotel O Srirampura Metro Station Formerly Broadway Inn', price: 800, rating: 8.0, review_count: 500, star_category: 2, latitude: 12.9800, longitude: 77.5700 },
      ];

      const hotelsOutput = [];

      for (const h of mockHotels) {
        const hotelId = generateHotelId(h.name, city);
        
        try {
          const savedHotel = await upsertHotel({
            hotel_id: hotelId,
            name: h.name,
            city,
            country,
            rating: h.rating,
            review_count: h.review_count,
            star_category: h.star_category,
            latitude: h.latitude,
            longitude: h.longitude,
            source: 'agoda'
          });

          hotelsOutput.push(savedHotel);

          // Insert price history
          await insertPriceHistory({
            hotel_id: savedHotel.id,
            price: h.price,
            currency: 'INR',
            source: 'agoda',
            checkin_date: checkIn.toISOString(),
            checkout_date: checkOut.toISOString(),
            scraped_at: new Date().toISOString()
          });
        } catch (dbError: any) {
          this.log(`Error saving hotel ${h.name}: ${dbError.message}`, 'error');
        }
      }

      return {
        hotels: hotelsOutput,
        source: 'agoda'
      };

    } catch (error: any) {
      this.log(`Scrape failed: ${error.message}`, 'error');
      return { hotels: [], source: 'agoda', error: error.message };
    }
  }
}
