import { supabase, type RoomType } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotel_id');

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('room_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as RoomType[]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
