import { BaseScraper, ScrapeParams, ScrapeResult } from './base-scraper';
import { upsertHotels, upsertPrices, logScrape, updateScrapeLog } from './utils/db-client';
import { generateHotelId } from './utils/formatter';

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
      const pricesOutput = [];

      for (const h of mockHotels) {
        const hotelId = generateHotelId(h.name, city);
        
        hotelsOutput.push({
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

        pricesOutput.push({
          hotel_id: hotelId,
          price: h.price,
          currency: 'INR',
          source: 'expedia',
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          scraped_at: new Date().toISOString()
        });
      }

      const savedHotels = await upsertHotels(hotelsOutput);
      
      // Update prices to use the internal database IDs
      const finalPrices = pricesOutput.map(p => {
        const matchingHotel = savedHotels.find(sh => sh.hotel_id === p.hotel_id);
        return { ...p, hotel_id: matchingHotel?.id || p.hotel_id };
      });

      await upsertPrices(finalPrices);

      return {
        hotels: savedHotels,
        source: 'expedia'
      };

    } catch (error: any) {
      this.log(`Scrape failed: ${error.message}`, 'error');
      return { hotels: [], source: 'expedia', error: error.message };
    }
  }
}
