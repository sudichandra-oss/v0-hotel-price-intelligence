import { NextRequest, NextResponse } from 'next/server';
import { BookingScraper } from '@/scripts/scrapers/booking-scraper';

export const maxDuration = 120;

/**
 * Debug endpoint to test scraper functionality
 * Safe to expose - helps diagnose scraper issues
 */
export async function POST(request: NextRequest) {
  try {
    const { city = 'Mumbai', checkIn, checkOut } = await request.json();

    console.log(`[DEBUG] Testing BookingScraper for ${city}`);

    const checkInDate = new Date(checkIn || new Date());
    const checkOutDate = new Date(checkOut || new Date(Date.now() + 86400000));

    const scraper = new BookingScraper();
    const result = await Promise.race([
      scraper.scrape({ city, country: 'India', checkIn: checkInDate, checkOut: checkOutDate }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 40s')), 40000)),
    ]);

    return NextResponse.json({
      success: true,
      city,
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0],
      hotelCount: (result as any)?.hotels?.length || 0,
      hotels: ((result as any)?.hotels || []).slice(0, 5).map((h: any) => ({
        name: h.name,
        address: h.address,
        price: h.price,
        rating: h.rating,
        currency: h.currency,
      })),
      message: 'Scraper executed successfully',
    });
  } catch (error: any) {
    console.error('[DEBUG] Scraper error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        hint: 'Check if Puppeteer can access the website. The site may be blocking requests or the CSS selectors may have changed.',
      },
      { status: 500 }
    );
  }
}
