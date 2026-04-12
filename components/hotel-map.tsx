'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Hotel } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Star, Loader2, Sparkles } from 'lucide-react';

interface HotelMapProps {
  onHotelSelect?: (hotel: Hotel) => void;
}

export function HotelMap({ onHotelSelect }: HotelMapProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

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

  const fetchSuggestions = async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/cities/suggest?q=${q}`);
    const data = await res.json();
    setSuggestions(data);
    setShowSuggestions(true);
  };

  useEffect(() => {
    fetchHotels();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fetchHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchHotels(city);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setCity(suggestion);
    setShowSuggestions(false);
    fetchHotels(suggestion);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    onHotelSelect?.(hotel);
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="relative max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <Input
            placeholder="Type a city (e.g. Mumbai, London...)"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onFocus={() => city.length >= 2 && setShowSuggestions(true)}
            className="pl-12 py-6 text-lg bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 focus:ring-blue-500/20 backdrop-blur-xl rounded-2xl transition-all"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 btn-premium px-6 rounded-xl font-semibold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionRef}
            className="absolute z-50 w-full mt-2 glass-morphism rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full px-6 py-4 text-left hover:bg-white/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel, idx) => (
          <div
            key={hotel.id}
            className={`glass-card rounded-3xl p-6 cursor-pointer group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`}
            style={{ animationDelay: `${idx * 100}ms` }}
            onClick={() => handleSelectHotel(hotel)}
          >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-xl leading-tight group-hover:text-blue-400 transition-colors">
                  {hotel.name}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{hotel.city}, {hotel.country}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {hotel.rating || 'N/A'}
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-0">
                  {hotel.star_category}-Star
                </Badge>
              </div>

              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.slice(0, 3).map((amenity, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                      {amenity}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/30">
                <span>View Details</span>
                <span className="font-mono">{hotel.source}</span>
              </div>
            </div>
            
            {selectedHotel?.id === hotel.id && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 shadow-[0_-4px_12px_rgba(59,130,246,0.5)]" />
            )}
          </div>
        ))}
      </div>

      {!loading && hotels.length === 0 && (
        <div className="text-center py-20 animate-in fade-in duration-700">
          <div className="inline-block p-6 glass-morphism rounded-full mb-6">
            <Search className="w-12 h-12 text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No hotels found</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Try searching for a different city or check if the background scrapers are running.
          </p>
          <Button 
            onClick={() => fetchHotels()} 
            variant="outline" 
            className="mt-6 border-slate-700 hover:bg-slate-800"
          >
            Show All Hotels
          </Button>
        </div>
      )}
    </div>
  );
}
