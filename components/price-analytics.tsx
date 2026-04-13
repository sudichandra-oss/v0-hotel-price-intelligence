'use client';

import { useEffect, useState } from 'react';
import { Hotel, PriceHistory } from '@/lib/supabase';
import {
  Calendar,
  Star,
  Tag,
  Globe,
  TrendingDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceAnalyticsProps {
  hotel: Hotel | null;
  competitors?: Hotel[];
}

const DAYS_PER_PAGE = 7;
const TOTAL_DAYS = 30;

// We will now strictly use the real data from the hotel object.
// If the hotel has sourceBreakdown, we use it. 
// Note: For a real 30-day view, we'd need historical logs per day, 
// for now we will show the current breakdown if it's "Today", 
// otherwise show "No Data" as requested to avoid mockups.
function DayCard({ date, hotel, isToday }: { date: Date; hotel: Hotel; isToday: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sources = isToday ? (hotel.sourceBreakdown || []) : [];
  const best = sources.length > 0 ? sources.reduce((a, b) => a.price < b.price ? a : b) : null;

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div
      onClick={() => sources.length > 0 && setExpanded(!expanded)}
      className={cn(
        'group relative bg-white border rounded-[2rem] p-5 space-y-4 transition-all duration-300',
        sources.length > 0 ? 'cursor-pointer hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-0.5' : 'opacity-80',
        isToday ? 'ring-2 ring-slate-900 ring-offset-2' : 'border-slate-100'
      )}
    >
      {/* Date Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className="text-xl font-black text-slate-900 tracking-tighter">
            {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        {isToday && (
          <span className="text-[8px] font-black uppercase bg-slate-900 text-white px-2 py-1 rounded-full">Today</span>
        )}
      </div>

      {/* Best Price or Empty State */}
      <div className="space-y-1">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Best Rate</p>
        <div className="flex items-baseline gap-1">
          {best ? (
            <>
              <span className="text-2xl font-black text-slate-900">₹{formatPrice(best.price)}</span>
              <TrendingDown className="w-3 h-3 text-emerald-500 mb-1" />
            </>
          ) : (
            <span className="text-sm font-bold text-slate-300 italic uppercase">Log Missing</span>
          )}
        </div>
      </div>

      {/* Source Details or Metadata */}
      <div className="space-y-2 pt-2 border-t border-slate-50 min-h-[60px]">
        {best ? (
          <>
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-[9px] font-black uppercase text-slate-900 truncate">{best.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-[9px] font-bold text-slate-500 truncate">Standard Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
              <span className="text-[9px] font-bold text-slate-900">{hotel.rating || '4.0'}</span>
            </div>
          </>
        ) : (
          <p className="text-[8px] font-bold text-slate-200 uppercase leading-relaxed">No scraper activity recorded for this sector on this cycle.</p>
        )}
      </div>

      {/* Expanded: all sources */}
      {expanded && sources.length > 0 && best && (
        <div className="pt-4 border-t border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Verified Sources</p>
          {sources.map((s) => (
            <div
              key={s.source}
              className={cn(
                'flex items-center justify-between p-2 rounded-xl',
                s.source === best.source ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50'
              )}
            >
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase text-slate-900">{s.source}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-black text-slate-900">₹{formatPrice(s.price)}</p>
                {s.source === best.source && (
                  <p className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter">Best Found</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PriceAnalytics({ hotel, competitors = [] }: PriceAnalyticsProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(TOTAL_DAYS / DAYS_PER_PAGE);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All 30 days
  const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const visibleDays = allDays.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);

  // Hotels to show: primary + competitors (if no primary, just competitors)
  const hotelsToShow = hotel
    ? [hotel, ...competitors.filter(c => c.id !== hotel.id)]
    : competitors;

  if (hotelsToShow.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-300 space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
          <Calendar className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em]">No Tracked Hotels</p>
          <p className="text-[10px] text-slate-300">Track hotels in Overview to view Calendar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Intelligence Register</p>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">30-DAY CALENDAR</h2>
        </div>
        {/* Pagination controls */}
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Days {page * DAYS_PER_PAGE + 1}–{Math.min((page + 1) * DAYS_PER_PAGE, TOTAL_DAYS)} of {TOTAL_DAYS}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                'p-3 rounded-2xl border border-slate-100 transition-all',
                page === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === page ? 'bg-slate-900 w-6' : 'bg-slate-200 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className={cn(
                'p-3 rounded-2xl border border-slate-100 transition-all',
                page === totalPages - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid — one section per hotel */}
      <div className="space-y-12">
        {hotelsToShow.map((h) => (
          <div key={h.id} className="space-y-4">
            {/* Hotel label */}
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-slate-900" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{h.name}</p>
              <div className="flex-1 h-px bg-slate-100" />
              <p className="text-[9px] font-bold text-slate-400 uppercase">{h.source || 'Multi-source'}</p>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {visibleDays.map((date) => (
                <DayCard
                  key={date.toISOString()}
                  date={date}
                  hotel={h}
                  isToday={date.getTime() === today.getTime()}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex items-center justify-between">
        <div className="flex gap-12">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Window</p>
            <p className="text-xl font-black">30-Day Intelligent Scan</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hotels Monitored</p>
            <p className="text-xl font-black text-green-400">{hotelsToShow.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current View</p>
            <p className="text-xl font-black">
              Page {page + 1} / {totalPages}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className={cn(
              'px-6 py-3 rounded-2xl border border-white/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
              page === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous 7 Days
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className={cn(
              'px-6 py-3 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
              page === totalPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 active:scale-95'
            )}
          >
            Next 7 Days
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
