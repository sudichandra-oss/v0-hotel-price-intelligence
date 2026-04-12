'use client';

import { useEffect, useState } from 'react';
import { Hotel, PriceHistory } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PriceAnalyticsProps {
  hotel: Hotel | null;
}

export function PriceAnalytics({ hotel }: PriceAnalyticsProps) {
  const [prices, setPrices] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    if (!hotel) {
      setPrices([]);
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/prices?hotel_id=${hotel.id}&days=${timeframe}`
        );
        const data = await response.json();
        setPrices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        setPrices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [hotel, timeframe]);

  if (!hotel) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          Select a hotel to view price analytics
        </CardContent>
      </Card>
    );
  }

  const chartData = prices.map((p) => ({
    date: new Date(p.stay_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    price: p.price,
    source: p.source,
  }));

  const avgPrice = prices.length > 0
    ? (prices.reduce((sum, p) => sum + p.price, 0) / prices.length).toFixed(2)
    : 0;

  const minPrice = prices.length > 0
    ? Math.min(...prices.map((p) => p.price))
    : 0;

  const maxPrice = prices.length > 0
    ? Math.max(...prices.map((p) => p.price))
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{hotel.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {hotel.address}
              </p>
            </div>
            <Badge>★ {hotel.rating}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{avgPrice}</div>
            <p className="text-xs text-gray-500 mt-1">
              {hotel.currency || 'INR'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Lowest Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{minPrice}</div>
            <p className="text-xs text-gray-500 mt-1">
              {prices.length} data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Highest Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{maxPrice}</div>
            <p className="text-xs text-gray-500 mt-1">
              Last {timeframe} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Price Trend</CardTitle>
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList>
                <TabsTrigger value="7">7D</TabsTrigger>
                <TabsTrigger value="30">30D</TabsTrigger>
                <TabsTrigger value="90">90D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Loading price data...
            </div>
          ) : prices.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No price data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
