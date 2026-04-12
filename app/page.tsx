'use client';

import { useState } from 'react';
import { Hotel } from '@/lib/supabase';
import { HotelMap } from '@/components/hotel-map';
import { PriceAnalytics } from '@/components/price-analytics';
import { CompetitorCompare } from '@/components/competitor-compare';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([]);

  const handleHotelSelect = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    if (!selectedHotels.find(h => h.id === hotel.id)) {
      setSelectedHotels([...selectedHotels, hotel]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Hotel Price Intelligence</h1>
          <p className="text-slate-400">
            Monitor hotel prices, track trends, and compare competitors in real-time
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="search">Search Hotels</TabsTrigger>
            <TabsTrigger value="analytics">Price Analytics</TabsTrigger>
            <TabsTrigger value="competitors">Compare Competitors</TabsTrigger>
          </TabsList>

          {/* Search Hotels Tab */}
          <TabsContent value="search" className="space-y-4">
            <HotelMap onHotelSelect={handleHotelSelect} />
          </TabsContent>

          {/* Price Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <PriceAnalytics hotel={selectedHotel} />
          </TabsContent>

          {/* Competitor Comparison Tab */}
          <TabsContent value="competitors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Selected Hotels ({selectedHotels.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedHotels.length === 0 ? (
                  <p className="text-gray-400">
                    Select hotels from the Search tab to compare
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {selectedHotels.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{hotel.name}</p>
                          <p className="text-sm text-slate-400">
                            {hotel.city}, {hotel.country}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedHotels(
                              selectedHotels.filter(h => h.id !== hotel.id)
                            )
                          }
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <CompetitorCompare hotels={selectedHotels} />
          </TabsContent>
        </Tabs>

        {/* Stats Section */}
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total Hotels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">---</div>
              <p className="text-xs text-slate-400 mt-1">In database</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">
                Price Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">---</div>
              <p className="text-xs text-slate-400 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">
                Avg Price Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">---</div>
              <p className="text-xs text-slate-400 mt-1">Week over week</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">---</div>
              <p className="text-xs text-slate-400 mt-1">Price monitoring</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
