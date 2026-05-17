import { BaseScraper, ScrapeResult } from './base-scraper';
import { formatPrice, generateHotelId } from './utils/formatter';

/**
 * Google Hotels API Scraper using Serper API
 * Provides fallback pricing data when primary scrapers fail
 * 
 * To use: Set SERPER_API_KEY environment variable
 * Serper provides free tier: https://serper.dev
 */
export class GoogleScraper extends BaseScraper {
  private apiKey: string;

  constructor() {
    super('Google Hotels');
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  async scrape(params: { city: string; country: string; checkIn: Date; checkOut: Date }): Promise<ScrapeResult> {
    const { city, country, checkIn, checkOut } = params;
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    try {
      // Calculate number of nights
      const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      if (!this.apiKey) {
        this.log('SERPER_API_KEY not set, using mock data', 'warn');
        return this.getMockHotels(city, country);
      }

      // Search using Serper API
      const searchQuery = `hotels in ${city} ${checkInStr} to ${checkOutStr}`;
      const response = await fetch('https://google.serper.dev/hotels', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          gl: 'in', // India region
          hl: 'en',
          autocorrect: true,
          type: 'hotels',
        }),
      });

      if (!response.ok) {
        this.log(`API request failed: ${response.status}`, 'error');
        return this.getMockHotels(city, country);
      }

      const data = await response.json();
      const hotels: any[] = [];

      // Parse Serper API response
      if (data.hotels && Array.isArray(data.hotels)) {
        for (const item of data.hotels.slice(0, 30)) {
          // Extract price from various formats
          let price = 0;
          let currency = 'INR';

          if (item.price) {
            // Try to parse price string
            const priceMatch = item.price.match(/[\d,]+(?:\.\d+)?/);
            if (priceMatch) {
              price = parseInt(priceMatch[0].replace(/,/g, ''), 10);
            }
            if (item.price.includes('$')) currency = 'USD';
            else if (item.price.includes('₹')) currency = 'INR';
            else if (item.price.includes('€')) currency = 'EUR';
          }

          if (price === 0 || !item.title) continue;

          // Generate coordinates with jitter to prevent stacking
          const cityCoords: Record<string, [number, number]> = {
            'Mumbai': [19.0760, 72.8777],
            'Delhi': [28.6139, 77.2090],
            'London': [51.5074, -0.1278],
            'Goa': [15.2993, 74.1240],
            'Kochi': [9.9312, 76.2673],
            'Varkala': [8.7374, 76.7063],
          };

          const base = cityCoords[city] || [20, 77];
          const lat = base[0] + (Math.random() - 0.5) * 0.1;
          const lng = base[1] + (Math.random() - 0.5) * 0.1;

          hotels.push({
            hotel_id: generateHotelId(item.title, city),
            name: item.title,
            address: item.address || `${city}, ${country}`,
            city,
            country,
            rating: item.rating ? parseFloat(item.rating) : 0,
            review_count: item.review_count || 0,
            star_category: this.getRatingCategory(item.rating ? parseFloat(item.rating) : 0),
            latitude: lat,
            longitude: lng,
            source: 'google',
            price,
            currency,
            meal_plan: 'As per availability',
            check_in_date: checkInStr,
            check_out_date: checkOutStr,
            stay_date: checkInStr,
            nights,
            amenities: item.amenities || [],
            image_url: item.image,
          });
        }
      }

      this.log(`Retrieved ${hotels.length} hotels from Google Hotels API`, 'info');
      return { hotels, source: 'google' };
    } catch (error: any) {
      this.log(`Scrape error: ${error.message}`, 'error');
      return this.getMockHotels(city, country);
    }
  }

  /**
   * Fallback mock data when API is unavailable
   */
  private getMockHotels(city: string, country: string): ScrapeResult {
    const mockHotels = [
      {
        hotel_id: generateHotelId('Luxury Suite Hotel', city),
        name: 'Luxury Suite Hotel',
        address: `${city}, ${country}`,
        city,
        country,
        rating: 4.5,
        review_count: 2500,
        star_category: '5',
        latitude: 19.08,
        longitude: 72.88,
        source: 'google_mock',
        price: 5500,
        currency: 'INR',
        meal_plan: 'Breakfast included',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
      {
        hotel_id: generateHotelId('Budget Stay Inn', city),
        name: 'Budget Stay Inn',
        address: `${city}, ${country}`,
        city,
        country,
        rating: 4.0,
        review_count: 1800,
        star_category: '3',
        latitude: 19.09,
        longitude: 72.87,
        source: 'google_mock',
        price: 1800,
        currency: 'INR',
        meal_plan: 'Room only',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
      {
        hotel_id: generateHotelId('Premium Resort', city),
        name: 'Premium Resort',
        address: `${city}, ${country}`,
        city,
        country,
        rating: 4.7,
        review_count: 3200,
        star_category: '5',
        latitude: 19.07,
        longitude: 72.89,
        source: 'google_mock',
        price: 8999,
        currency: 'INR',
        meal_plan: 'All-inclusive',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    ];

    return { hotels: mockHotels, source: 'google' };
  }

  private getRatingCategory(rating: number): string {
    if (rating >= 4.5) return '5';
    if (rating >= 4.0) return '4';
    if (rating >= 3.0) return '3';
    if (rating >= 2.0) return '2';
    return '1';
  }
}
