import './utils/polyfill';
import { BaseScraper, ScrapeResult } from './base-scraper';
import { formatPrice, formatRating, formatReviewCount, generateHotelId, ratingToStarCategory } from './utils/formatter';
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
        
        // MMT meal plan extraction
        const mealPlan = $(el).find('.pc__roomOption:contains("Breakfast")').text().trim() || 
                        $(el).find('.pc__roomOption').first().text().trim() || 
                        'No meal specified';

        const rating = formatRating(ratingText);
        const reviewCount = formatReviewCount(ratingText);
        const price = formatPrice(priceText);

        if (name && price) {
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
            hotel_id: generateHotelId(name, city) + '-mmt',
            name,
            address,
            city,
            country,
            rating,
            review_count: reviewCount,
            star_category: ratingToStarCategory(rating),
            latitude: lat,
            longitude: lng,
            source: 'makemytrip',
            price,
            meal_plan: mealPlan,
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
            star_category: hotel.star_category,
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
