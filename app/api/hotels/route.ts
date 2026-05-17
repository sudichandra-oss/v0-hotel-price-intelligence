import { NextRequest, NextResponse } from 'next/server';

/**
 * Hotels API - Delegates to live scraper for real-time pricing
 * Backward compatible with existing client calls
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const star = searchParams.get('star'); // e.g. "3,4,5"
    const date = searchParams.get('date'); // e.g. "2026-04-13"
    const checkIn = date || new Date().toISOString().split('T')[0];
    const checkOut = searchParams.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (!city) {
      return NextResponse.json({ error: 'Missing city parameter' }, { status: 400 });
    }

    console.log(`[v0] Hotels API: Fetching live data for ${city} (${checkIn} to ${checkOut})`);

    // Call the live scraper endpoint
    const scraperUrl = new URL('/api/scrape/live', request.nextUrl.origin);
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city,
        checkIn,
        checkOut,
        providers: ['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia'],
      }),
    });

    if (!response.ok) {
      console.error(`[v0] Live scraper failed: ${response.status}`);
      // Fallback to empty array instead of error
      return NextResponse.json([]);
    }

    const data = await response.json();
    let hotels = data.hotels || [];

    // Filter by star category if provided
    if (star) {
      const starArray = star.split(',').map(s => parseInt(s));
      hotels = hotels.filter((h: any) => {
        const hotelStar = parseInt(h.star_category) || 3;
        return starArray.includes(hotelStar);
      });
    }

    console.log(`[v0] Hotels API: Returning ${hotels.length} hotels`);
    return NextResponse.json(hotels);
  } catch (error: any) {
    console.error('[v0] Hotels API error:', error);
    // Return empty array on error rather than throwing
    return NextResponse.json([]);
  }
}
