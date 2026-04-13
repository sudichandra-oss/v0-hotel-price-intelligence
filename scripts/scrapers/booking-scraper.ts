import './utils/polyfill';
import { BaseScraper, ScrapeResult } from './base-scraper';
import { formatPrice, formatRating, formatReviewCount, generateHotelId } from './utils/formatter';
import { upsertHotel, upsertRoomType, insertPriceHistory } from './utils/db-client';

export class BookingScraper extends BaseScraper {
  constructor() {
    super('Booking.com');
  }

  async scrape(params: { city: string; country: string; checkIn: Date; checkOut: Date }): Promise<ScrapeResult> {
    const { city, country, checkIn, checkOut } = params;
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkInStr}&checkout=${checkOutStr}&group_adults=2&no_rooms=1&group_children=0`;

    try {
      const { html, browser } = await this.fetchWithPuppeteer(url, '[data-testid="property-card"]');
      const $ = this.parseWithCheerio(html);
      const hotels: any[] = [];

      $('[data-testid="property-card"]').each((_, el) => {
        const name = $(el).find('[data-testid="title"]').text().trim();
        const address = $(el).find('[data-testid="address"]').text().trim();
        const ratingText = $(el).find('[data-testid="review-score"]').text().trim();
        const priceText = $(el).find('[data-testid="price-and-discounted-price"]').text().trim();
        
        // Extract meal plan info if available (e.g. "Breakfast included")
        const mealPlan = $(el).find('[data-testid="price-for-x-nights"] + div').text().trim() || 
                        $(el).find('.abf0933828').text().trim() || // Common class for meal info
                        'No meal specified';

        const rating = formatRating(ratingText);
        const reviewCount = formatReviewCount(ratingText);
        const price = formatPrice(priceText);

        if (name && price) {
          // Base coordinates for common cities to ensure map works
          const cityCoords: Record<string, [number, number]> = {
            'Mumbai': [19.0760, 72.8777],
            'Delhi': [28.6139, 77.2090],
            'London': [51.5074, -0.1278],
            'Goa': [15.2993, 74.1240],
            'Kochi': [9.9312, 76.2673],
            'Varkala': [8.7374, 76.7063],
          };

          const base = cityCoords[city] || [20, 77];
          // Add small jitter so hotels don't stack on map
          const lat = base[0] + (Math.random() - 0.5) * 0.1;
          const lng = base[1] + (Math.random() - 0.5) * 0.1;

          hotels.push({
            hotel_id: generateHotelId(name, city),
            name,
            address,
            city,
            country,
            rating,
            review_count: reviewCount,
            latitude: lat,
            longitude: lng,
            source: 'booking',
            price,
            meal_plan: mealPlan,
            currency: 'INR',
            stay_date: checkInStr,
            check_in_date: checkInStr,
            check_out_date: checkOutStr,
          });
        }
      });

      await browser.close();

      // Process and save to DB
      for (const hotel of hotels) {
        try {
          const savedHotel = await upsertHotel({
            hotel_id: hotel.hotel_id,
            name: hotel.name,
            address: hotel.address,
            city: hotel.city,
            country: hotel.country,
            rating: hotel.rating,
            review_count: hotel.review_count,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            source: hotel.source,
          });

          const roomType = await upsertRoomType({
            hotel_id: savedHotel.id,
            room_name: 'Standard Room',
            meal_plan: hotel.meal_plan,
            base_price: hotel.price,
            currency: hotel.currency,
          });

          await insertPriceHistory({
            hotel_id: savedHotel.id,
            room_type_id: roomType.id,
            stay_date: hotel.stay_date,
            price: hotel.price,
            currency: hotel.currency,
            source: hotel.source,
            check_in_date: hotel.check_in_date,
            check_out_date: hotel.check_out_date,
          });

        } catch (dbError: any) {
          this.log(`Error saving hotel ${hotel.name}: ${dbError.message}`, 'error');
        }
      }

      return { hotels };
    } catch (error: any) {
      this.log(`Scrape failed: ${error.message}`, 'error');
      return { hotels: [], error: error.message };
    }
  }
}

// Allow running directly for testing
if (require.main === module) {
  const scraper = new BookingScraper();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  scraper.scrape({
    city: 'Mumbai',
    country: 'India',
    checkIn: tomorrow,
    checkOut: dayAfter,
  }).then(result => {
    console.log(`Scraped ${result.hotels.length} hotels`);
  });
}
