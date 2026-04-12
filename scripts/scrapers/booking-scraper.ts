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
        
        // Extract rating and review count from ratingText (e.g. "8.5 1,234 reviews")
        const rating = formatRating(ratingText);
        const reviewCount = formatReviewCount(ratingText);
        const price = formatPrice(priceText);

        if (name && price) {
          hotels.push({
            hotel_id: generateHotelId(name, city),
            name,
            address,
            city,
            country,
            rating,
            review_count: reviewCount,
            source: 'booking',
            price,
            currency: 'INR', // Defaulting to INR for now, should detect
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
            latitude: 0, // Need to find these or set defaults
            longitude: 0,
            source: hotel.source,
          });

          // Dummy room type for now as it requires navigating to hotel page
          const roomType = await upsertRoomType({
            hotel_id: savedHotel.id,
            room_name: 'Standard Room',
            meal_plan: 'Not Specified',
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
            CHECK_IN_DATE: hotel.check_in_date,
            CHECK_OUT_DATE: hotel.check_out_date,
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
