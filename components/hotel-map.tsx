'use client';

import { useEffect, useState, useCallback } from 'react';
import { Hotel } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HotelMapProps {
  onHotelSelect?: (hotel: Hotel) => void;
}

export function HotelMap({ onHotelSelect }: HotelMapProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const fetchHotels = useCallback(async (searchCity?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCity) params.append('city', searchCity);
      
      const response = await fetch(`/api/hotels?${params}`);
      const data = await response.json();
      setHotels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch hotels:', error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHotels(city);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    onHotelSelect?.(hotel);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hotel Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <Card
            key={hotel.id}
            className={`cursor-pointer transition-all ${
              selectedHotel?.id === hotel.id
                ? 'ring-2 ring-blue-500'
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleSelectHotel(hotel)}
          >
            <CardContent className="pt-6 space-y-2">
              <div>
                <h3 className="font-semibold text-lg">{hotel.name}</h3>
                <p className="text-sm text-gray-500">{hotel.city}, {hotel.country}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">★ {hotel.rating || 'N/A'}</Badge>
                <Badge variant="secondary">{hotel.star_category}-Star</Badge>
              </div>

              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {hotel.amenities.slice(0, 3).map((amenity, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500">
                Lat: {hotel.latitude.toFixed(4)}, Lng: {hotel.longitude.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && hotels.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No hotels found. Try searching by city.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
