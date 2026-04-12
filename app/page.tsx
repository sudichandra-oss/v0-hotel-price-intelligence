'use client';

import { useState, useEffect } from 'react';
import { Hotel } from '@/lib/supabase';
import { HotelMap } from '@/components/hotel-map';
import { PriceAnalytics } from '@/components/price-analytics';
import { CompetitorCompare } from '@/components/competitor-compare';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, LayoutDashboard, LineChart, Users, Zap, TrendingUp, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/scrape/status')
      .then(res => res.json())
      .then(data => setRecentLogs(Array.isArray(data) ? data : []));
  }, []);

  const handleHotelSelect = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    if (!selectedHotels.find(h => h.id === hotel.id)) {
      setSelectedHotels([...selectedHotels, hotel]);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-[128px] animate-pulse delay-700" />
        </div>

        <div className="container mx-auto relative z-10 text-center">
          <Badge variant="outline" className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1 rounded-full animate-float">
            <Zap className="w-3 h-3 mr-2" />
            v2.0 Price Intelligence Active
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Elevate Your <span className="text-gradient">Pricing Strategy</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Monitor competitors, identify market gaps, and maximize revenue with our AI-powered hotel price intelligence engine.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Real-time Scraping</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Predictive Analytics</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Main Tabs */}
        <Tabs defaultValue="search" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-1 rounded-2xl h-auto">
              <TabsTrigger value="search" className="rounded-xl px-8 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Market Search
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl px-8 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <LineChart className="w-4 h-4 mr-2" />
                Price Trends
              </TabsTrigger>
              <TabsTrigger value="competitors" className="rounded-xl px-8 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <Users className="w-4 h-4 mr-2" />
                Competitors
              </TabsTrigger>
              <TabsTrigger value="status" className="rounded-xl px-8 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <Activity className="w-4 h-4 mr-2" />
                Scraper Health
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="space-y-4 outline-none">
            <HotelMap onHotelSelect={handleHotelSelect} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 outline-none">
            <div className="glass-card rounded-3xl p-8 min-h-[400px]">
              <PriceAnalytics hotel={selectedHotel} />
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="space-y-6 outline-none">
            <Card className="glass-card border-0 rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-800/50 pb-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  Selected Comparison Group ({selectedHotels.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedHotels.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <p>Select hotels from the Market Search tab to begin comparison.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedHotels.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-slate-600 transition-colors"
                      >
                        <div>
                          <p className="font-bold">{hotel.name}</p>
                          <p className="text-xs text-slate-500">
                            {hotel.city}, {hotel.country} • {hotel.source}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedHotels(
                              selectedHotels.filter(h => h.id !== hotel.id)
                            )
                          }
                          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="glass-card rounded-3xl p-8">
              <CompetitorCompare hotels={selectedHotels} />
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-6 outline-none">
            <Card className="glass-card border-0 rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Recent Scrape Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Platform</TableHead>
                      <TableHead className="text-slate-400">City</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Count</TableHead>
                      <TableHead className="text-slate-400 text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id} className="border-slate-800/50 hover:bg-white/5">
                        <TableCell className="font-medium capitalize">{log.website}</TableCell>
                        <TableCell>{log.city}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={log.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.hotels_count || 0}</TableCell>
                        <TableCell className="text-right text-slate-500 text-xs">
                          {new Date(log.started_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-4">
          {[
            { label: 'Market Depth', value: '1,280+', sub: 'Hotels tracked', icon: Users, color: 'text-blue-500' },
            { label: 'Data Velocity', value: '4.2k', sub: 'Weekly updates', icon: Activity, color: 'text-purple-500' },
            { label: 'Price Volatility', value: '+12%', sub: 'Avg WoW change', icon: TrendingUp, color: 'text-green-500' },
            { label: 'Yield Score', value: '94/100', sub: 'Market health', icon: Zap, color: 'text-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 border-slate-700/50">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 bg-slate-800 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black mb-1">{stat.value}</div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-[10px] text-slate-600 mt-2">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
