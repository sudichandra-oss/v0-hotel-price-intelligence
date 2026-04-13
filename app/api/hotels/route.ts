import { NextRequest, NextResponse } from 'next/server';
import { getMockDb } from '@/lib/mock-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const star = searchParams.get('star'); // e.g. "3,4,5"
    const date = searchParams.get('date'); // e.g. "2026-04-13"

    const db = getMockDb();
    let hotels = db.hotels || [];

    if (city) {
      hotels = hotels.filter((h: any) => h.city?.toLowerCase() === city.toLowerCase());
    }

    if (star) {
      const starArray = star.split(',').map(s => parseInt(s));
      hotels = hotels.filter((h: any) => starArray.includes(h.star_category));
    }

    // Join with price history to find best rates across all sources
    const priceHistory = db.price_history || [];
    
    const hotelsWithPricing = hotels.map((h: any) => {
      // Get all prices for this hotel
      let hotelPrices = priceHistory.filter((p: any) => p.hotel_id === h.id);
      
      // Filter by specific stay date if provided
      if (date) {
        hotelPrices = hotelPrices.filter((p: any) => p.stay_date === date);
      }

      // Group by source and find the LATEST price for each source
      const latestBySource: Record<string, any> = {};
      hotelPrices.forEach((p: any) => {
        if (!latestBySource[p.source] || new Date(p.scraped_at) > new Date(latestBySource[p.source].scraped_at)) {
          latestBySource[p.source] = p;
        }
      });

      const sourceBreakdown = Object.values(latestBySource).map((p: any) => ({
        source: p.source,
        price: p.price
      }));

      // Find the absolute lowest price across all sources
      const competitivePrices = sourceBreakdown.map(s => s.price);
      const lowestPrice = competitivePrices.length > 0 ? Math.min(...competitivePrices) : null;
      const bestSource = sourceBreakdown.find(s => s.price === lowestPrice)?.source || null;

      // Default price (for legacy UI compatibility)
      const defaultPrice = latestBySource['booking']?.price || (sourceBreakdown.length > 0 ? sourceBreakdown[0].price : null);

      return {
        ...h,
        price: lowestPrice || defaultPrice,
        source: bestSource || h.source || 'booking',
        lowest_price: lowestPrice,
        lowest_source: bestSource,
        sourceBreakdown
      };
    });

    return NextResponse.json(hotelsWithPricing);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
