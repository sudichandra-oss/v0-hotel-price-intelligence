'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// Leaflet should not be imported at top level to avoid SSR 'window is not defined' errors
const L = typeof window !== 'undefined' ? require('leaflet') : null;
import 'leaflet/dist/leaflet.css';
import { type Hotel } from '@/lib/supabase';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Separate Inner component to handle Leaflet hooks safely
function MapContent({ 
  hotels, 
  center, 
  selectedHotelId,
  myHotelId,
  onHotelClick 
}: { 
  hotels: Hotel[], 
  center: [number, number], 
  selectedHotelId: string | null | undefined,
  myHotelId?: string | null,
  onHotelClick?: (h: Hotel) => void
}) {
  const map = require('react-leaflet').useMap();
  const L = require('leaflet');

  useEffect(() => {
    if (map) {
      map.setView(center, map.getZoom());
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [center, map]);

  const createPriceIcon = (price: number, source: string, isSelected: boolean, isMyHotel: boolean) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center transition-all duration-500 scale-in shadow-xl">
          <div class="${isMyHotel ? 'bg-red-600 border-red-800' : 'bg-white border-slate-900'} border-2 ${isSelected ? 'ring-4 ring-red-500/20 scale-110' : ''} px-3 py-1.5 rounded-2xl shadow-2xl flex flex-col items-center min-w-[60px]">
            <span class="text-[9px] font-black ${isMyHotel ? 'text-white' : 'text-slate-900'} leading-none">₹${price.toLocaleString()}</span>
            <span class="text-[6px] font-bold ${isMyHotel ? 'text-white/60' : 'text-slate-400'} uppercase tracking-widest mt-0.5">${source}</span>
          </div>
          <div class="w-0.5 h-2 ${isMyHotel ? 'bg-red-600' : (isSelected ? 'bg-red-600' : 'bg-slate-900')}"></div>
        </div>
      `,
      iconSize: [60, 40],
      iconAnchor: [30, 40],
    });
  };

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {hotels.map((hotel) => {
        if (!hotel.latitude || !hotel.longitude) return null;
        const isSelected = selectedHotelId === hotel.id;
        const isMyHotel = myHotelId === hotel.id;

        return (
          <Marker
            key={hotel.id}
            position={[hotel.latitude, hotel.longitude]}
            icon={createPriceIcon(hotel.lowest_price || hotel.price || 0, hotel.lowest_source || hotel.source || 'Scraper', isSelected, isMyHotel)}
            eventHandlers={{
              click: () => onHotelClick?.(hotel)
            }}
          >
            <Popup>
              <div className="p-4 space-y-2 min-w-[200px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Best Price · {hotel.lowest_source || hotel.source || 'Scraper'}
                </p>
                <div className="flex items-center gap-2">
                  {isMyHotel && <Badge variant="secondary" className="bg-red-600 text-white text-[8px] font-black uppercase px-2 h-4">My Hotel</Badge>}
                  <h3 className="text-sm font-black text-slate-900 leading-tight">{hotel.name}</h3>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-400">Best Rate</span>
                  <span className="text-lg font-black text-slate-900">
                    {hotel.lowest_price || hotel.price ? `₹${(hotel.lowest_price || hotel.price || 0).toLocaleString()}` : 'Price Pending'}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function GeoIntelligenceMap({
  hotels,
  selectedHotelId,
  myHotelId,
  onHotelSelect,
}: {
  hotels: Hotel[];
  selectedHotelId?: string | null;
  myHotelId?: string | null;
  onHotelSelect?: (h: Hotel) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [showOnlyTracked, setShowOnlyTracked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredHotels = useMemo(() => {
    if (!showOnlyTracked) return hotels;
    return hotels.filter(h => h.id === myHotelId || h.lowest_source); // Assuming only tracked have source info or is my hotel
    // Better: if we had a isTracked prop, but for now we look at the source being known
  }, [hotels, showOnlyTracked, myHotelId]);

  const center: [number, number] = useMemo(() => {
    if (selectedHotelId) {
      const selected = hotels.find((h) => h.id === selectedHotelId);
      if (selected?.latitude && selected.longitude) {
        return [selected.latitude, selected.longitude];
      }
    }
    if (filteredHotels.length > 0) {
      const withCoords = filteredHotels.filter(h => h.latitude && h.longitude);
      if (withCoords.length > 0) {
        return [withCoords[0].latitude!, withCoords[0].longitude!];
      }
    }
    return [19.076, 72.8777]; // Mumbai default
  }, [filteredHotels, hotels, selectedHotelId]);

  if (!mounted) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initializing Geo-Sector...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative group">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '700px', width: '100%' }} 
        zoomControl={true} 
        scrollWheelZoom={true}
      >
        <MapContent 
          hotels={filteredHotels} 
          center={center} 
          selectedHotelId={selectedHotelId} 
          myHotelId={myHotelId}
          onHotelClick={onHotelSelect}
        />
      </MapContainer>

      {/* Floating Legend & Controls */}
      <div className="absolute top-8 left-8 z-[1000] space-y-4">
        {/* Toggle Controls */}
        <div className="p-4 bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl flex items-center justify-between gap-6 pointer-events-auto">
          <div className="flex flex-col">
            <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Inventory Filter</h4>
            <p className="text-[7px] font-bold text-slate-400 uppercase">{showOnlyTracked ? 'Tracked Only' : 'Market Overview'}</p>
          </div>
          <button
            onClick={() => setShowOnlyTracked(!showOnlyTracked)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
              showOnlyTracked ? 'bg-red-600' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                showOnlyTracked ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* Legend */}
        <div className="p-6 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-2xl max-w-[240px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-auto">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Geo Analysis</h4>
          <div className="space-y-3">
            {filteredHotels.slice(0, 10).map(h => (
              <button 
                key={h.id} 
                onClick={() => onHotelSelect?.(h)}
                className="w-full flex items-center justify-between gap-4 hover:bg-slate-50 p-1 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', 
                    h.id === myHotelId ? 'bg-red-600 pulse' : (selectedHotelId === h.id ? 'bg-slate-900' : 'bg-slate-300'))} 
                  />
                  <span className={cn('text-[8px] font-bold uppercase truncate', h.id === myHotelId ? 'text-red-600' : 'text-slate-900')}>{h.name}</span>
                </div>
                <span className="text-[8px] font-black text-slate-400 shrink-0">
                  {h.lowest_price || h.price ? `₹${(h.lowest_price || h.price || 0).toLocaleString()}` : '—'}
                </span>
              </button>
            ))}
            {filteredHotels.length === 0 && <p className="text-[8px] font-bold text-slate-200 uppercase">No tracked hotels</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
