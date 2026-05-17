'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Building, ExternalLink, Activity, Trophy, ChevronRight, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type Hotel } from '@/lib/supabase';

interface HotelSearchProps {
  query: string;
  setQuery: (query: string) => void;
  hotels: Hotel[];
  setHotels: (hotels: Hotel[]) => void;
  onHotelSelect?: (hotel: Hotel) => void;
  onSetMyHotel?: (id: string) => void;
  onAddCompetitor?: (hotel: Hotel) => void;
  myHotelId?: string | null;
  competitors?: Hotel[];
}

const SOURCE_LABEL: Record<string, string> = {
  booking: 'Booking.com',
  agoda: 'Agoda',
  expedia: 'Expedia',
};

export function HotelSearch({ 
  query,
  setQuery,
  hotels,
  setHotels,
  onHotelSelect, 
  onSetMyHotel, 
  onAddCompetitor,
  myHotelId,
  competitors = [] 
}: HotelSearchProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    // Set initial dates after mount to prevent hydration mismatch
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    setSelectedDate(today.toISOString().split('T')[0]);
    setCheckOutDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const searchHotels = async (searchCity: string, stars: number[], checkIn: string, checkOut: string) => {
    if (!searchCity || !checkIn || !checkOut) return;
    setLoading(true);
    setError('');
    try {
      console.log(`[v0] Searching hotels in ${searchCity} from ${checkIn} to ${checkOut}`);
      
      // Call the NEW live scraping API endpoint
      const response = await fetch('/api/scrape/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: searchCity,
          checkIn: checkIn,
          checkOut: checkOut,
          providers: ['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia'],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[v0] Received ${data.hotels?.length || 0} hotels from live scrape`);

      if (!data.success && (!data.hotels || data.hotels.length === 0)) {
        setError('No hotels found. Please try different dates or cities.');
        setHotels([]);
      } else {
        // Filter by star rating if selected
        let filtered = data.hotels || [];
        if (stars.length > 0) {
          filtered = filtered.filter((h: any) => {
            const starCategory = parseInt(h.star_category) || 3;
            return stars.includes(starCategory);
          });
        }

        setHotels(filtered);
        setFetchedAt(new Date(data.fetchedAt).toLocaleTimeString());

        // Log data sources
        if (data.sources && data.sources.length > 0) {
          console.log(`[v0] Data from: ${data.sources.join(', ')}`);
        }
        if (data.errors && Object.keys(data.errors).length > 0) {
          console.warn('[v0] Some sources failed:', data.errors);
        }
      }
    } catch (error: any) {
      console.error('[v0] Search error:', error);
      setError(error.message || 'Failed to fetch hotels. Please try again.');
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.length > 2 && selectedDate && checkOutDate) {
      const timer = setTimeout(() => searchHotels(query, selectedStars, selectedDate, checkOutDate), 800);
      return () => clearTimeout(timer);
    }
  }, [query, selectedStars, selectedDate, checkOutDate]);

  const toggleStar = (star: number) => {
    setSelectedStars(prev => 
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };

  const getStarCategory = (hotel: Hotel): string => {
    const category = hotel.star_category || 3;
    return `${category}-Star`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-red-500/5 blur-2xl rounded-full transition-all group-focus-within:bg-red-500/10" />
          <div className="relative flex items-center bg-white border border-slate-200 rounded-3xl p-2 pl-6 shadow-sm hover:border-slate-300 transition-all focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-100/50">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <Input 
              className="border-none shadow-none focus-visible:ring-0 text-lg h-12 bg-transparent placeholder:text-slate-300 font-black uppercase tracking-tight"
              placeholder="QUICK SELECT HOTEL IN CITY..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Hotel Category</p>
            {[2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => toggleStar(star)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                  selectedStars.includes(star) 
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                )}
              >
                {star} ★
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-100 mx-2 hidden sm:block" />
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Dates</p>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-100 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
            />
            <span className="text-slate-300 text-xs">→</span>
            <input 
              type="date" 
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="bg-white border border-slate-100 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">Fetching live hotel prices...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
          <p className="text-sm font-bold text-red-700 uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Data Freshness Indicator */}
      {fetchedAt && !loading && (
        <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Last updated: {fetchedAt}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 scrollbar-hide pb-20">
        {hotels.map((hotel) => {
          const isMyHotel = myHotelId === hotel.id;
          const isCompetitor = competitors.some(c => c.id === hotel.id);
          
          return (
            <div 
              key={hotel.id}
              onClick={() => onHotelSelect?.(hotel)}
              className={cn(
                "group relative bg-white border rounded-[2.5rem] p-8 transition-all duration-300 cursor-pointer overflow-hidden",
                isMyHotel ? "border-slate-900 ring-1 ring-slate-100 shadow-2xl" : "border-slate-100 hover:border-slate-300 hover:shadow-2xl hover:-translate-y-1"
              )}
            >
              {isMyHotel && (
                <div className="absolute top-0 right-0 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">
                  My Base Property
                </div>
              )}

              <div className="flex flex-col gap-8">
                {/* Info Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-red-800 transition-colors uppercase tracking-tighter">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{hotel.city}, {hotel.country}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-slate-900">{hotel.rating || 'N/A'}</span>
                      </div>
                      <div className="px-2.5 py-1 bg-blue-50 rounded-full border border-blue-100">
                        <span className="text-[8px] font-black text-blue-700 uppercase">{getStarCategory(hotel)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant={isMyHotel ? "default" : "outline"}
                      className={cn("h-10 flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                        isMyHotel ? "bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200" : "hover:border-slate-900 hover:bg-slate-50")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetMyHotel?.(hotel.id);
                      }}
                    >
                      {isMyHotel ? "Designated as Mine" : "Designate as Mine"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isCompetitor ? "secondary" : "outline"}
                      className={cn("h-10 flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        isCompetitor ? "bg-green-50 text-green-700 border-green-100 shadow-none" : "hover:border-slate-900")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCompetitor?.(hotel);
                      }}
                    >
                      {isCompetitor ? "Tracked" : "Track Competitor"}
                    </Button>
                  </div>
                </div>

                {/* Pricing Intelligence Grid */}
                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-100 scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="px-5 py-2.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Distribution Channel</th>
                          <th className="px-5 py-2.5 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          const breakdown = hotel.sourceBreakdown || [];
                          // If no breakdown data, show a message
                          if (breakdown.length === 0) {
                            return (
                              <tr>
                                <td colSpan={2} className="px-5 py-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                                  No distribution data collected
                                </td>
                              </tr>
                            );
                          }
                          
                          // Find the actual minimum price among the real data
                          const minPriceInBreakdown = Math.min(...breakdown.map(b => b.price));

                          return breakdown.map((item) => {
                            const isLowest = item.price === minPriceInBreakdown;
                            return (
                              <tr key={item.source} className={cn("group/row transition-colors", isLowest ? "bg-emerald-50/50" : "hover:bg-slate-50/50")}>
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-1 h-1 rounded-full", 
                                      isLowest ? "bg-emerald-500 animate-pulse" : "bg-slate-200")} />
                                    <span className={cn("text-[9px] font-bold uppercase tracking-tight", 
                                      isLowest ? "text-emerald-900" : "text-slate-500")}>
                                      {SOURCE_LABEL[item.source] || item.source}
                                    </span>
                                    {isLowest && (
                                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-[6px] font-black h-3 px-1 uppercase">Best Rate</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className={cn("text-[10px] font-black", 
                                      isLowest ? "text-emerald-600" : "text-slate-400")}>
                                      ₹{formatPrice(item.price)}
                                    </span>
                                    <ExternalLink className={cn("w-2.5 h-2.5 transition-colors", isLowest ? "text-emerald-300" : "text-slate-200 group-hover/row:text-slate-400")} />
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 px-2 pt-2">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Market Floor</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                      ₹{formatPrice(hotel.lowest_price || hotel.price || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && query.length > 2 && hotels.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-xl font-black text-slate-900 uppercase">No Intelligence Matches</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Try another city intelligence sector</p>
          </div>
        )}
      </div>
    </div>
  );
}
