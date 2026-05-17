import { NextRequest, NextResponse } from 'next/server';
import { getHotelsForCity, getPriceHistoryForHotel } from '@/lib/scrape-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const hotelId = searchParams.get('hotelId');
    const type = searchParams.get('type') || 'hotels'; // 'hotels' or 'priceHistory'

    if (!city && !hotelId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: city or hotelId',
        },
        { status: 400 }
      );
    }

    if (type === 'priceHistory' && hotelId) {
      // Get price history for a specific hotel
      const priceHistory = getPriceHistoryForHotel(hotelId);
      return NextResponse.json({
        success: true,
        hotelId,
        priceHistory,
        count: priceHistory.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Get all hotels for a city
    if (city) {
      const hotels = getHotelsForCity(city);
      return NextResponse.json({
        success: true,
        city,
        hotels,
        count: hotels.length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request parameters',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[v0] Error fetching scraped data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scraped data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
