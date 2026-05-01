import { NextRequest, NextResponse } from 'next/server';
import { enqueueJob } from '@/lib/scraper-queue';

export async function POST(request: NextRequest) {
  try {
    const { 
      city = 'Mumbai', 
      country = 'India',
      startDate, 
      endDate, 
      providers = ['Booking.com'] 
    } = await request.json();

    // Validate inputs
    if (!city || !providers || providers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: city, providers' },
        { status: 400 }
      );
    }

    // Parse dates
    const checkIn = startDate ? new Date(startDate) : new Date();
    const checkOut = endDate ? new Date(endDate) : new Date(checkIn.getTime() + 86400000);
    
    const startDateStr = checkIn.toISOString().split('T')[0];
    const endDateStr = checkOut.toISOString().split('T')[0];

    // Queue the scrape job instead of running it inline
    const job = enqueueJob(city, country, startDateStr, endDateStr, providers);

    console.log(`[v0] Scrape job queued: ${job.id} for ${city}`);

    return NextResponse.json({ 
      message: 'Scrape job queued successfully',
      jobId: job.id,
      city,
      providers,
      startDate: startDateStr,
      endDate: endDateStr,
    }, { status: 202 });
  } catch (error: any) {
    console.error('[v0] Scrape API error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to queue scrape job' }, { status: 500 });
  }
}
