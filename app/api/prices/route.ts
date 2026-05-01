import { supabase } from '@/lib/supabase';
import { getMockDb } from '@/lib/mock-db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotel_id');
    const roomTypeId = searchParams.get('room_type_id');
    const days = searchParams.get('days') || '30';

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Use mock DB if Supabase is not available
    if (!supabase) {
      const db = getMockDb();
      let priceHistory = db.price_history || [];
      
      priceHistory = priceHistory.filter((p: any) => 
        p.hotel_id === hotelId && 
        p.stay_date >= startDateStr
      );

      if (roomTypeId) {
        priceHistory = priceHistory.filter((p: any) => p.room_type_id === roomTypeId);
      }

      return NextResponse.json(priceHistory.sort((a: any, b: any) => 
        new Date(a.stay_date).getTime() - new Date(b.stay_date).getTime()
      ));
    }

    let query = supabase
      .from('price_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('stay_date', startDateStr);

    if (roomTypeId) {
      query = query.eq('room_type_id', roomTypeId);
    }

    const { data, error } = await query.order('stay_date');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!supabase) {
      const { getMockDb, saveMockDb } = await import('@/lib/mock-db');
      const { randomUUID } = await import('crypto');
      
      const db = getMockDb();
      const newRecord = {
        id: `mock-price-${randomUUID()}`,
        ...body,
        created_at: new Date().toISOString(),
        scraped_at: new Date().toISOString()
      };
      db.price_history.push(newRecord);
      saveMockDb(db);
      return NextResponse.json(newRecord, { status: 201 });
    }

    const { data, error } = await supabase
      .from('price_history')
      .insert([body])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
