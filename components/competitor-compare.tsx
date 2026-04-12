'use client';

import { useEffect, useState } from 'react';
import { Hotel, RoomType, PriceHistory } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CompetitorCompareProps {
  hotels: Hotel[];
}

interface ComparisonData {
  hotel: Hotel;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  roomCount: number;
}

export function CompetitorCompare({ hotels }: CompetitorCompareProps) {
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hotels.length === 0) {
      setComparison([]);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      try {
        const compData: ComparisonData[] = await Promise.all(
          hotels.map(async (hotel) => {
            const [pricesRes, roomsRes] = await Promise.all([
              fetch(`/api/prices?hotel_id=${hotel.id}&days=30`),
              fetch(`/api/rooms?hotel_id=${hotel.id}`),
            ]);

            const prices = await pricesRes.json();
            const rooms = await roomsRes.json();

            const priceArray = Array.isArray(prices) ? prices : [];
            const roomArray = Array.isArray(rooms) ? rooms : [];

            return {
              hotel,
              avgPrice: priceArray.length > 0
                ? parseFloat((priceArray.reduce((sum: number, p: PriceHistory) => sum + p.price, 0) / priceArray.length).toFixed(2))
                : 0,
              minPrice: priceArray.length > 0
                ? Math.min(...priceArray.map((p: PriceHistory) => p.price))
                : 0,
              maxPrice: priceArray.length > 0
                ? Math.max(...priceArray.map((p: PriceHistory) => p.price))
                : 0,
              roomCount: roomArray.length,
            };
          })
        );

        setComparison(compData.sort((a, b) => a.avgPrice - b.avgPrice));
      } catch (error) {
        console.error('Failed to fetch comparison:', error);
        setComparison([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [hotels]);

  if (hotels.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          Select multiple hotels to compare
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Price Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            Loading comparison data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Min Price</TableHead>
                  <TableHead className="text-right">Max Price</TableHead>
                  <TableHead className="text-right">Rooms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((item) => (
                  <TableRow key={item.hotel.id}>
                    <TableCell className="font-medium">{item.hotel.name}</TableCell>
                    <TableCell>{item.hotel.city}</TableCell>
                    <TableCell>
                      <Badge variant="outline">★ {item.hotel.rating || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{item.avgPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{item.minPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ₹{item.maxPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{item.roomCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
