'use client';

import { useState, useEffect } from 'react';
import { Hotel } from '@/lib/supabase';
import { HotelSearch } from '@/components/hotel-search';
import { PriceAnalytics } from '@/components/price-analytics';
import { PriceBenchmark } from '@/components/price-benchmark';
import { ScrapeStats } from '@/components/scrape-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ScraperControl } from '@/components/scraper-control';
import { GeoIntelligenceMap } from '@/components/geo-intelligence-map';
import { ScraperHealth } from '@/components/scraper-health';
import { OrdinaryLogo } from '@/components/ui/ordinary-logo';
import { cn } from '@/lib/utils';
import { X, Building2, TrendingDown, Database, CheckCircle2, Clock, AlertTriangle, Globe, RefreshCw, LayoutDashboard } from 'lucide-react';
function TrackedSidebar({
  competitors, myHotel, onHotelSelect, onAddCompetitor, selectedId, onReset, onSave
}: {
  competitors: Hotel[];
  myHotel: Hotel | null;
  onHotelSelect: (h: Hotel) => void;
  onAddCompetitor: (h: Hotel) => void;
  selectedId: string | null;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col h-screen sticky top-0 w-64 shrink-0 border-r border-slate-100 bg-white">
      {/* Logo */}
      <div className="p-6 pb-4 border-b border-slate-50">
        <OrdinaryLogo />
      </div>

      {/* Tracked List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tracked ({competitors.length})</p>
          <LayoutDashboard className="w-3.5 h-3.5 text-slate-200" />
        </div>

        {myHotel && (
          <button
            onClick={() => onHotelSelect(myHotel)}
            className={cn(
              'w-full text-left p-4 rounded-2xl border transition-all',
              selectedId === myHotel.id ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-100'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0" />
              <p className={cn('text-[8px] font-black uppercase tracking-widest', selectedId === myHotel.id ? 'text-white/60' : 'text-slate-400')}>My Property</p>
            </div>
            <p className={cn('text-[10px] font-black uppercase truncate', selectedId === myHotel.id ? 'text-white' : 'text-slate-900')}>{myHotel.name}</p>
          </button>
        )}

        {competitors.length === 0 && !myHotel && (
          <div className="py-10 text-center">
            <TrendingDown className="w-5 h-5 text-slate-100 mx-auto mb-2" />
            <p className="text-[8px] font-black text-slate-200 uppercase leading-loose">Track hotels<br />from overview</p>
          </div>
        )}

        {competitors.map(hotel => (
          <div
            key={hotel.id}
            onClick={() => onHotelSelect(hotel)}
            className={cn(
              'w-full text-left p-3 rounded-2xl border transition-all relative cursor-pointer group/item',
              selectedId === hotel.id ? 'bg-white border-slate-200 shadow-lg' : 'bg-slate-50/60 border-transparent hover:bg-white hover:border-slate-100'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onHotelSelect(hotel);
              }
            }}
          >
            {selectedId === hotel.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-red-800 rounded-r-full" />}
            <p className="text-[9px] font-black uppercase text-slate-900 truncate pl-1">{hotel.name}</p>
            <div className="flex items-center gap-2 mt-1 pl-1">
              <span className="text-[9px] font-black text-slate-900">₹{(hotel.lowest_price || hotel.price || 0).toLocaleString()}</span>
              <span className="text-[7px] font-bold text-slate-300 uppercase">{hotel.lowest_source || hotel.source || 'Agoda'}</span>
              <button 
                onClick={e => { e.stopPropagation(); onAddCompetitor(hotel); }} 
                className="ml-auto text-slate-200 hover:text-red-400 transition-colors"
                aria-label={`Remove ${hotel.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Persistence Controls */}
      {(myHotel || competitors.length > 0) && (
        <div className="p-5 grid grid-cols-2 gap-2 border-t border-slate-50 bg-slate-50/30">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-100 bg-white text-[8px] font-black text-slate-400 uppercase hover:text-red-600 hover:border-red-100 transition-all font-black uppercase tracking-widest text-[8px]"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-[8px] font-black text-white uppercase hover:bg-slate-800 transition-all shadow-sm font-black uppercase tracking-widest text-[8px]"
          >
            Save List
          </button>
        </div>
      )}

      {/* Scraper Health — pinned bottom */}
      <ScraperHealth />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Scraper Data Tab
// ─────────────────────────────────────────────────
interface CityData {
  city: string;
  country: string;
  hotelCount: number;
  sources: string[];
  lastScraped: string | null;
  jobs: { status: string; website: string; records_inserted: number; started_at: string }[];
}

function ScraperDataTab() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cities/data');
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch { setCities([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalHotels = cities.reduce((a, c) => a + c.hotelCount, 0);
  const totalJobs   = cities.reduce((a, c) => a + c.jobs.length, 0);

  return (
    <div className="space-y-10">
      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Cities Indexed', value: cities.length, icon: Globe },
          { label: 'Total Hotels', value: totalHotels, icon: Building2 },
          { label: 'Scrape Jobs', value: totalJobs, icon: Database },
          { label: 'Last Updated', value: cities[0]?.lastScraped ? new Date(cities[0].lastScraped).toLocaleDateString('en-IN') : '—', icon: Clock },
        ].map(s => (
          <div key={s.label} className="bg-slate-50 rounded-[2rem] p-8 space-y-3">
            <s.icon className="w-5 h-5 text-slate-300" />
            <p className="text-3xl font-black text-slate-900">{s.value}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City Intelligence Index</p>
        <button onClick={fetchData} className="flex items-center gap-2 text-[9px] font-black text-slate-900 uppercase border border-slate-100 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* City Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
        </div>
      ) : cities.length === 0 ? (
        <div className="text-center py-20 text-slate-300">
          <Database className="w-12 h-12 mx-auto mb-4" />
          <p className="font-black text-[11px] uppercase tracking-widest">No data yet — run a scraper job</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {cities.map(c => {
            const successJobs = c.jobs.filter(j => j.status === 'success').length;
            const failedJobs  = c.jobs.filter(j => j.status === 'failure').length;
            const totalRecords = c.jobs.reduce((a, j) => a + (j.records_inserted || 0), 0);
            const isExpanded = expandedCity === c.city;

            return (
              <div key={c.city} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden hover:shadow-lg hover:shadow-slate-100 transition-all">
                <button
                  onClick={() => setExpandedCity(isExpanded ? null : c.city)}
                  className="w-full text-left p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <h3 className="font-black text-xl tracking-tighter text-slate-900 uppercase">{c.city}</h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{c.country}</span>
                      </div>
                      {/* Source Tags */}
                      <div className="flex flex-wrap gap-2">
                        {c.sources.map(s => (
                          <span key={s} className="text-[8px] font-black uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 text-center shrink-0">
                      <div>
                        <p className="text-xl font-black text-slate-900">{c.hotelCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Hotels</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-green-600">{successJobs}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">OK Jobs</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-red-500">{failedJobs}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Failed</p>
                      </div>
                    </div>

                    {/* Last scraped */}
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Last Scraped</p>
                      <p className="text-[10px] font-black text-slate-900">
                        {c.lastScraped ? new Date(c.lastScraped).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                      <p className="text-[9px] font-black text-slate-400">{totalRecords.toLocaleString()} records</p>
                    </div>
                  </div>
                </button>

                {/* Expanded: job log */}
                {isExpanded && c.jobs.length > 0 && (
                  <div className="border-t border-slate-50 px-8 pb-8">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-6 pb-3">Recent Jobs ({c.jobs.length})</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {c.jobs.map((job, i) => (
                        <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl text-[9px]', job.status === 'success' ? 'bg-green-50' : job.status === 'failure' ? 'bg-red-50' : 'bg-slate-50')}>
                          {job.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : job.status === 'failure' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            : <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className="font-black text-slate-900 uppercase">{job.website}</span>
                          <span className={cn('font-bold uppercase', job.status === 'success' ? 'text-green-600' : 'text-red-500')}>{job.status}</span>
                          <span className="text-slate-400 font-bold">{(job.records_inserted || 0)} records</span>
                          <span className="ml-auto text-slate-300">{job.started_at ? new Date(job.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────
export default function Dashboard() {
  const [hotels, setHotels]           = useState<Hotel[]>([]);
  const [query, setQuery]             = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [myHotel, setMyHotel]         = useState<Hotel | null>(null);
  const [competitors, setCompetitors] = useState<Hotel[]>([]);

  // Persist selections to localStorage
  const handleSave = () => {
    localStorage.setItem('ordinary_my_hotel', JSON.stringify(myHotel));
    localStorage.setItem('ordinary_competitors', JSON.stringify(competitors));
    toast.success('Your tracked inventory list has been saved');
  };

  const handleReset = () => {
    setMyHotel(null);
    setCompetitors([]);
    setHotels([]);
    setQuery('');
    setSelectedHotel(null);
    localStorage.removeItem('ordinary_my_hotel');
    localStorage.removeItem('ordinary_competitors');
    toast.info('Tracked inventory and search results cleared');
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedMyHotel     = localStorage.getItem('ordinary_my_hotel');
    const savedCompetitors = localStorage.getItem('ordinary_competitors');
    if (savedMyHotel)     setMyHotel(JSON.parse(savedMyHotel));
    if (savedCompetitors) setCompetitors(JSON.parse(savedCompetitors));
  }, []);

  const handleSetMyHotel = (id: string) => {
    const hotel = hotels.find(h => h.id === id);
    if (hotel) {
      // Toggle logic
      if (myHotel?.id === hotel.id) {
        setMyHotel(null);
        toast.info(`Removed '${hotel.name}' from your property`);
      } else {
        setMyHotel(hotel);
        toast.success(`'${hotel.name}' set as your property`);
      }
    }
  };

  const handleSelectCompetitor = (hotel: Hotel) => {
    if (competitors.find(c => c.id === hotel.id)) {
      setCompetitors(prev => prev.filter(c => c.id !== hotel.id));
      toast.info(`Stopped tracking ${hotel.name}`);
    } else {
      setCompetitors(prev => [...prev, hotel]);
      toast.success(`Now tracking ${hotel.name}`);
    }
  };

  // FIX: Tracked hotels should be the independent list of objects, not filtered from current search results
  const trackedHotelsItems = [...competitors];
  if (myHotel && !competitors.find(c => c.id === myHotel.id)) {
    trackedHotelsItems.push(myHotel);
  }

  return (
    <div className="bg-white min-h-screen overflow-x-hidden flex">
      <Toaster position="top-right" theme="light" richColors />

      {/* Left Sidebar */}
      <TrackedSidebar
        competitors={competitors}
        myHotel={myHotel}
        onHotelSelect={setSelectedHotel}
        onAddCompetitor={handleSelectCompetitor}
        selectedId={selectedHotel?.id ?? null}
        onReset={handleReset}
        onSave={handleSave}
      />

      {/* Main Content */}
      <div className="flex-1 p-10 space-y-8 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-6">
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Intelligence Hub</h1>
          <ScraperControl />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full space-y-10">
          <TabsList className="bg-slate-50 p-2 rounded-[2rem] border-none inline-flex h-auto">
            {[
              { value: 'overview',     label: 'Overview' },
              { value: 'geo',          label: 'Geo Intelligence' },
              { value: 'benchmarking', label: 'Benchmarking' },
              { value: 'analytics',    label: 'Analytics' },
              { value: 'scraper-data', label: 'Scraper Data' },
            ].map(t => (
              <TabsTrigger
                key={t.value} value={t.value}
                className="px-8 py-4 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xl transition-all"
              >{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HotelSearch
              query={query}
              setQuery={setQuery}
              hotels={hotels}
              setHotels={setHotels}
              onHotelSelect={setSelectedHotel}
              onSetMyHotel={handleSetMyHotel}
              onAddCompetitor={handleSelectCompetitor}
              myHotelId={myHotel?.id}
              competitors={competitors}
            />
          </TabsContent>

          {/* Geo */}
          <TabsContent value="geo" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-50 rounded-[3.5rem] overflow-hidden min-h-[700px] shadow-sm relative">
              <GeoIntelligenceMap 
                hotels={(() => {
                  const combined = [...trackedHotelsItems];
                  hotels.forEach(h => {
                    if (!combined.find(c => c.id === h.id)) {
                      combined.push(h);
                    }
                  });
                  return combined;
                })()} 
                selectedHotelId={selectedHotel?.id} 
                myHotelId={myHotel?.id}
                onHotelSelect={setSelectedHotel}
              />
            </div>
          </TabsContent>

          {/* Benchmarking */}
          <TabsContent value="benchmarking" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-50 rounded-[3.5rem] p-12 min-h-[700px] shadow-sm">
              <PriceBenchmark
                myHotel={myHotel}
                competitors={competitors}
                dateRange={{ from: new Date(), to: new Date(new Date().setDate(new Date().getDate() + 7)) }}
              />
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-50 rounded-[3.5rem] p-12 min-h-[700px] shadow-sm">
              <PriceAnalytics hotel={selectedHotel} competitors={competitors} />
            </div>
          </TabsContent>

          {/* Scraper Data */}
          <TabsContent value="scraper-data" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ScrapeStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
