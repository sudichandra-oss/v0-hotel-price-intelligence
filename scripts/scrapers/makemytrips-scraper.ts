import './utils/polyfill';
import { BaseScraper, ScrapeResult } from './base-scraper';
import { formatPrice, formatRating, formatReviewCount, generateHotelId } from './utils/formatter';
import { upsertHotel, upsertRoomType, insertPriceHistory } from './utils/db-client';

export class MMTScraper extends BaseScraper {
  constructor() {
    super('MakeMyTrip');
  }

  async scrape(params: { city: string; country: string; checkIn: Date; checkOut: Date }): Promise<ScrapeResult> {
    const { city, country, checkIn, checkOut } = params;
    
    // MMT date format DDMMYYYY
    const formatDate = (date: Date) => {
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${m}${d}${y}`;
    };

    const checkInStr = formatDate(checkIn);
    const checkOutStr = formatDate(checkOut);
    const isoCheckIn = checkIn.toISOString().split('T')[0];
    const isoCheckOut = checkOut.toISOString().split('T')[0];

    // MMT often uses city codes (e.g. BOM for Mumbai). For simplicity, we search by city name if possible
    // or use a simplified URL structure. 
    // Note: MMT is very aggressive with bot detection.
    const url = `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${checkInStr}&checkout=${checkOutStr}&city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`;

    try {
      // MMT requires a bit more time to load
      const { html, browser } = await this.fetchWithPuppeteer(url, '.listingCard');
      const $ = this.parseWithCheerio(html);
      const hotels: any[] = [];

      $('.listingCard').each((_, el) => {
        const name = $(el).find('#hlistpg_hotel_name').text().trim();
        const address = $(el).find('.pc__address').text().trim();
        const ratingText = $(el).find('#hlistpg_hotel_user_rating').text().trim();
        const priceText = $(el).find('#hlistpg_hotel_shown_price').text().trim();
        
        const rating = formatRating(ratingText);
        const reviewCount = formatReviewCount(ratingText);
        const price = formatPrice(priceText);

        if (name && price) {
          hotels.push({
            hotel_id: generateHotelId(name, city) + '-mmt',
            name,
            address,
            city,
            country,
            rating,
            review_count: reviewCount,
            source: 'makemytrip',
            price,
            currency: 'INR',
            stay_date: isoCheckIn,
            check_in_date: isoCheckIn,
            check_out_date: isoCheckOut,
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
            latitude: 0,
            longitude: 0,
            source: hotel.source,
          });

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

if (require.main === module) {
  const scraper = new MMTScraper();
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
