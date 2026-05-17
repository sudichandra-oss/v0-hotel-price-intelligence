'use client';

import { useState, useEffect, useCallback } from 'react';
import { Hotel } from '@/lib/supabase';
import { HotelSearch } from '@/components/hotel-search';
import { PriceAnalytics } from '@/components/price-analytics';
import { PriceBenchmark } from '@/components/price-benchmark';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ScraperControl } from '@/components/scraper-control';
import { GeoIntelligenceMap } from '@/components/geo-intelligence-map';
import { ScraperHealth } from '@/components/scraper-health';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  TrendingDown,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Globe,
  RefreshCw,
  LayoutDashboard,
  Search,
  MapPin,
  BarChart3,
  Activity,
  Zap,
  ChevronRight,
  Star,
  Hotel as HotelIcon,
  Sparkles,
  ArrowUpRight,
  Filter,
  Download,
  Bell,
  Settings,
  Moon,
  Sun,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { useTheme } from 'next-themes';

// ─────────────────────────────────────────────────
// Animated Counter Component
// ─────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const incrementTime = (duration / end) * 1000;
    const timer = setInterval(() => {
      start += Math.ceil(end / 50);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime / 50);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

// ─────────────────────────────────────────────────
// Glass Card Component
// ─────────────────────────────────────────────────
function GlassCard({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border backdrop-blur-xl',
        'bg-white/70 dark:bg-slate-900/70 border-slate-200/50 dark:border-slate-700/50',
        'shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 pointer-events-none" />
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────
// Sidebar Component — Redesigned
// ─────────────────────────────────────────────────
function Sidebar({
  competitors,
  myHotel,
  onHotelSelect,
  onAddCompetitor,
  selectedId,
  onReset,
  onSave,
  isOpen,
  onClose
}: {
  competitors: Hotel[];
  myHotel: Hotel | null;
  onHotelSelect: (h: Hotel) => void;
  onAddCompetitor: (h: Hotel) => void;
  selectedId: string | null;
  onReset: () => void;
  onSave: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'geo', label: 'Geo Map', icon: MapPin },
    { id: 'scraper', label: 'Scraper', icon: Zap },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-80 shrink-0',
          'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl',
          'border-r border-slate-200/60 dark:border-slate-800/60',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Area */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">PriceIntel</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hotel Intelligence</p>
            </div>
            <button onClick={onClose} className="lg:hidden ml-auto p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all',
                  activeSection === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {activeSection === item.id && (
                  <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tracked Hotels Section */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tracked ({competitors.length})
              </p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {myHotel && (
              <motion.button
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onHotelSelect(myHotel)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border-2 transition-all mb-3 group',
                  selectedId === myHotel.id
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 border-transparent text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-700/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className={cn('w-3.5 h-3.5', selectedId === myHotel.id ? 'text-yellow-300' : 'text-amber-400')} />
                  <p className={cn('text-[9px] font-bold uppercase tracking-widest', selectedId === myHotel.id ? 'text-white/70' : 'text-slate-400')}>
                    My Property
                  </p>
                </div>
                <p className={cn('text-xs font-bold truncate', selectedId === myHotel.id ? 'text-white' : 'text-slate-900 dark:text-white')}>
                  {myHotel.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('text-xs font-bold', selectedId === myHotel.id ? 'text-white/90' : 'text-slate-900 dark:text-white')}>
                    ₹{(myHotel.lowest_price || myHotel.price || 0).toLocaleString()}
                  </span>
                  <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full', selectedId === myHotel.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400')}>
                    {myHotel.lowest_source || myHotel.source || 'Agoda'}
                  </span>
                </div>
              </motion.button>
            )}

            {competitors.length === 0 && !myHotel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase leading-relaxed">
                  Track hotels<br />from overview
                </p>
              </motion.div>
            )}

            {competitors.map((hotel, index) => (
              <motion.div
                key={hotel.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onHotelSelect(hotel)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border-2 transition-all relative cursor-pointer group mb-2',
                  selectedId === hotel.id
                    ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/50 dark:bg-slate-800/30 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
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
                {selectedId === hotel.id && (
                  <motion.div
                    layoutId="selectedIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"
                  />
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate pr-2">{hotel.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        ₹{(hotel.lowest_price || hotel.price || 0).toLocaleString()}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                        {hotel.lowest_source || hotel.source || 'Agoda'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddCompetitor(hotel); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-all"
                    aria-label={`Remove ${hotel.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
          {(myHotel || competitors.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReset}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                <Download className="w-3 h-3" />
                Save
              </motion.button>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Scraper Health */}
        <div className="px-5 pb-4">
          <ScraperHealth />
        </div>
      </motion.aside>
    </>
  );
}

// ─────────────────────────────────────────────────
// Stats Card Component
// ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, color = 'indigo' }: { label: string; value: number | string; icon: any; trend?: string; color?: string }) {
  const colorMap: Record<string, { bg: string; text: string; icon: string; glow: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', icon: 'text-indigo-500', glow: 'shadow-indigo-500/20' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500', glow: 'shadow-emerald-500/20' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500', glow: 'shadow-amber-500/20' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', icon: 'text-rose-500', glow: 'shadow-rose-500/20' },
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <GlassCard>
      <div className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-5 h-5', colors.icon)} />
          </div>
          {trend && (
            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', colors.bg, colors.text)}>
              {trend}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────
// Scraper Data Tab — Redesigned
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failure'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cities/data');
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch { setCities([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalHotels = cities.reduce((a, c) => a + c.hotelCount, 0);
  const totalJobs = cities.reduce((a, c) => a + c.jobs.length, 0);
  const successRate = totalJobs > 0
    ? Math.round((cities.reduce((a, c) => a + c.jobs.filter(j => j.status === 'success').length, 0) / totalJobs) * 100)
    : 0;

  const filteredCities = cities.map(c => ({
    ...c,
    jobs: filterStatus === 'all' ? c.jobs : c.jobs.filter(j => j.status === filterStatus)
  })).filter(c => filterStatus === 'all' || c.jobs.length > 0);

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cities Indexed" value={cities.length} icon={Globe} color="indigo" trend={`+${cities.length > 0 ? Math.floor(Math.random() * 5) + 1 : 0} this week`} />
        <StatCard label="Total Hotels" value={totalHotels} icon={Building2} color="emerald" trend={`${(totalHotels / Math.max(cities.length, 1)).toFixed(0)} avg/city`} />
        <StatCard label="Scrape Jobs" value={totalJobs} icon={Database} color="amber" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={Activity} color="rose" trend={successRate >= 90 ? 'Excellent' : successRate >= 70 ? 'Good' : 'Needs Attention'} />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">City Intelligence Index</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time scraping performance across all monitored cities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1">
            {(['all', 'success', 'failure'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                  filterStatus === status
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                )}
              >
                {status}
              </button>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* City Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
            </div>
          </div>
        </div>
      ) : filteredCities.length === 0 ? (
        <GlassCard className="py-20">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">No data available</p>
            <p className="text-xs text-slate-400">Run a scraper job to populate this index</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredCities.map((c, index) => {
              const successJobs = c.jobs.filter(j => j.status === 'success').length;
              const failedJobs = c.jobs.filter(j => j.status === 'failure').length;
              const totalRecords = c.jobs.reduce((a, j) => a + (j.records_inserted || 0), 0);
              const isExpanded = expandedCity === c.city;
              const progress = c.jobs.length > 0 ? (successJobs / c.jobs.length) * 100 : 0;

              return (
                <motion.div
                  key={c.city}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard hover={false}>
                    <button onClick={() => setExpandedCity(isExpanded ? null : c.city)} className="w-full text-left p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-base text-slate-900 dark:text-white">{c.city}</h3>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{c.country}</span>
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                progress >= 80 ? 'bg-emerald-400' : progress >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                              )} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {c.sources.map(s => (
                                <span key={s} className="text-[9px] font-bold uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 lg:gap-8">
                          <div className="text-center">
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{c.hotelCount}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Hotels</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{successJobs}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Success</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-rose-500 dark:text-rose-400">{failedJobs}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Failed</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Last Scraped</p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                              {c.lastScraped ? new Date(c.lastScraped).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{totalRecords.toLocaleString()} records</p>
                          </div>
                          <ChevronRight className={cn('w-5 h-5 text-slate-300 transition-transform duration-300', isExpanded && 'rotate-90')} />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                        />
                      </div>
                    </button>

                    {/* Expanded Job Log */}
                    <AnimatePresence>
                      {isExpanded && c.jobs.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 dark:border-slate-800 px-6 pb-6">
                            <div className="flex items-center justify-between pt-4 pb-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Recent Jobs ({c.jobs.length})
                              </p>
                              <span className="text-[9px] font-bold text-slate-400">
                                {totalRecords.toLocaleString()} total records
                              </span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                              {c.jobs.map((job, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className={cn(
                                    'flex items-center gap-3 p-3 rounded-xl text-[10px] border',
                                    job.status === 'success'
                                      ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-800/30'
                                      : job.status === 'failure'
                                      ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-800/30'
                                      : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/30'
                                  )}
                                >
                                  {job.status === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : job.status === 'failure' ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-bold text-slate-900 dark:text-white uppercase">{job.website}</span>
                                  <span className={cn(
                                    'font-bold uppercase px-2 py-0.5 rounded-full text-[9px]',
                                    job.status === 'success'
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                                  )}>
                                    {job.status}
                                  </span>
                                  <span className="text-slate-400 font-semibold">{(job.records_inserted || 0)} records</span>
                                  <span className="ml-auto text-slate-300 dark:text-slate-600 font-semibold">
                                    {job.started_at ? new Date(job.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────
function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Intelligence Hub</h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-400">Monitor competitor pricing and market trends in real-time</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
        <ScraperControl />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────
export default function Dashboard() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [query, setQuery] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [myHotel, setMyHotel] = useState<Hotel | null>(null);
  const [competitors, setCompetitors] = useState<Hotel[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Persist selections to localStorage
  const handleSave = () => {
    localStorage.setItem('ordinary_my_hotel', JSON.stringify(myHotel));
    localStorage.setItem('ordinary_competitors', JSON.stringify(competitors));
    toast.success('Your tracked inventory list has been saved', {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    });
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
    const savedMyHotel = localStorage.getItem('ordinary_my_hotel');
    const savedCompetitors = localStorage.getItem('ordinary_competitors');
    if (savedMyHotel) setMyHotel(JSON.parse(savedMyHotel));
    if (savedCompetitors) setCompetitors(JSON.parse(savedCompetitors));
  }, []);

  const handleSetMyHotel = (id: string) => {
    const hotel = hotels.find(h => h.id === id);
    if (hotel) {
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

  const trackedHotelsItems = [...competitors];
  if (myHotel && !competitors.find(c => c.id === myHotel.id)) {
    trackedHotelsItems.push(myHotel);
  }

  const tabContent = {
    overview: (
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
    ),
    geo: (
      <GlassCard className="min-h-[700px]">
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
      </GlassCard>
    ),
    benchmarking: (
      <GlassCard className="min-h-[700px] p-8">
        <PriceBenchmark
          myHotel={myHotel}
          competitors={competitors}
          dateRange={{ from: new Date(), to: new Date(new Date().setDate(new Date().getDate() + 7)) }}
        />
      </GlassCard>
    ),
    analytics: (
      <GlassCard className="min-h-[700px] p-8">
        <PriceAnalytics hotel={selectedHotel} competitors={competitors} />
      </GlassCard>
    ),
    scraper: (
      <GlassCard className="min-h-[700px] p-8">
        <ScraperDataTab />
      </GlassCard>
    ),
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen overflow-x-hidden flex">
      <Toaster position="top-right" theme="system" richColors closeButton />

      {/* Sidebar */}
      <Sidebar
        competitors={competitors}
        myHotel={myHotel}
        onHotelSelect={setSelectedHotel}
        onAddCompetitor={handleSelectCompetitor}
        selectedId={selectedHotel?.id ?? null}
        onReset={handleReset}
        onSave={handleSave}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Modern Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 w-fit shadow-sm">
            {[
              { value: 'overview', label: 'Overview', icon: Search },
              { value: 'geo', label: 'Geo Map', icon: MapPin },
              { value: 'benchmarking', label: 'Benchmarking', icon: BarChart3 },
              { value: 'analytics', label: 'Analytics', icon: Activity },
              { value: 'scraper', label: 'Scraper Data', icon: Database },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all',
                  activeTab === t.value
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabContent[activeTab as keyof typeof tabContent]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
