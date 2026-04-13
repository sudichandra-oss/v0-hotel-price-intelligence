import { NextRequest, NextResponse } from 'next/server';
import { getMockDb, saveMockDb } from '@/lib/mock-db';

export async function GET(request: NextRequest) {
  try {
    const db = getMockDb();
    
    const stats = {
      total_hotels: db.hotels?.length || 0,
      total_prices: db.price_history?.length || 0,
      sources_available: [...new Set((db.price_history || []).map((p: any) => p.source))],
      sample_hotels: (db.hotels || []).slice(0, 3).map((h: any) => ({
        id: h.id,
        name: h.name,
        city: h.city,
        source: h.source
      })),
      sample_prices: (db.price_history || []).slice(0, 5).map((p: any) => ({
        hotel_id: p.hotel_id,
        price: p.price,
        source: p.source,
        scraped_at: p.scraped_at
      }))
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
