import { BaseScraper, ScrapeParams, ScrapeResult } from './base-scraper';
import { upsertHotel, insertPriceHistory } from './utils/db-client';
import { generateHotelId, ratingToStarCategory } from './utils/formatter';

export class ExpediaScraper extends BaseScraper {
  constructor() {
    super('Expedia');
  }

  async scrape(params: ScrapeParams): Promise<ScrapeResult> {
    const { city, country, checkIn, checkOut } = params;
    
    try {
      this.log(`Simulating Expedia scrape for ${city}...`);
      await new Promise(r => setTimeout(r, 1500));

      const mockHotels = [
        { name: 'The Taj Mahal Tower', price: 19500, rating: 9.2, review_count: 3100, star_category: 5, latitude: 18.9218, longitude: 72.8333 },
        { name: 'Trident Nariman Point', price: 13000, rating: 9.0, review_count: 2800, star_category: 5, latitude: 18.9256, longitude: 72.8212 },
        { name: 'JW Marriott', price: 16000, rating: 8.8, review_count: 950, star_category: 4, latitude: 19.1000, longitude: 72.8500 },
        { name: 'Click Hotels Andheri MIDC', price: 2800, rating: 8.0, review_count: 620, star_category: 3, latitude: 19.1177, longitude: 72.8755 },
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
            source: 'expedia'
          });

          hotelsOutput.push(savedHotel);

          // Insert price history
          await insertPriceHistory({
            hotel_id: savedHotel.id,
            price: h.price,
            currency: 'INR',
            source: 'expedia',
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
        source: 'expedia'
      };

    } catch (error: any) {
      this.log(`Scrape failed: ${error.message}`, 'error');
      return { hotels: [], source: 'expedia', error: error.message };
    }
  }
}
