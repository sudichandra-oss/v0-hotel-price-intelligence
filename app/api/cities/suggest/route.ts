import { NextRequest, NextResponse } from 'next/server';

const CITIES = [
  // India
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa',
  // UK
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool',
  // US
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco', 'Las Vegas',
  // Europe
  'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Barcelona', 'Vienna'
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json([]);
  }

  const suggestions = CITIES.filter(city => 
    city.toLowerCase().startsWith(query.toLowerCase()) ||
    city.toLowerCase().includes(` ${query.toLowerCase()}`)
  );

  return NextResponse.json(suggestions.slice(0, 5));
}
