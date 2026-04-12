import { supabase, type PriceHistory } from '@/lib/supabase';
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

    let query = supabase
      .from('price_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('stay_date', startDate.toISOString().split('T')[0]);

    if (roomTypeId) {
      query = query.eq('room_type_id', roomTypeId);
    }

    const { data, error } = await query.order('stay_date');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as PriceHistory[]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('price_history')
      .insert([body])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
