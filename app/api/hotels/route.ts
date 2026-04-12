import { supabase, type Hotel } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getMockDb } from '@/lib/mock-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const bounds = searchParams.get('bounds'); // minLat,maxLat,minLng,maxLng

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const db = getMockDb();
      let results = db.hotels;
      if (city) {
        results = results.filter(h => h.city.toLowerCase().includes(city.toLowerCase()));
      }
      return NextResponse.json(results);
    }

    let query = supabase.from('hotels').select('*');

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (bounds) {
      const [minLat, maxLat, minLng, maxLng] = bounds.split(',').map(Number);
      query = query
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng);
    }

    const { data, error } = await query.order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Hotel[]);
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

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ ...body, id: 'mock-' + Date.now() }, { status: 201 });
    }

    const { data, error } = await supabase
      .from('hotels')
      .insert([body as any])
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
