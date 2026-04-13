'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Loader2, CheckCircle2, X, Calendar, MapPin, Check,
  AlertTriangle, ChevronDown, ChevronUp, Clock, Activity
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  'Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia', 'Airbnb', 
  'Goibibo', 'Hotels.com', 'Klook', 'Trip.com', 'Vio.com'
];

interface ScrapeLog {
  id?: string;
  city?: string;
  website?: string;
  status?: string;
  records_inserted?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface ScrapeStatus {
  progress: number;
  total: number;
  completed: number;
  latest: ScrapeLog | null;
  logs?: ScrapeLog[];
}

export function ScraperControl() {
  const [isScraping, setIsScraping]   = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [showLogs, setShowLogs]       = useState(true);
  const [progress, setProgress]       = useState(0);
  const [statusData, setStatusData]   = useState<ScrapeStatus | null>(null);
  const [logs, setLogs]               = useState<ScrapeLog[]>([]);
  const [elapsedSec, setElapsedSec]   = useState(0);
  const startTimeRef                  = useRef<number | null>(null);

  // Modal fields
  const [city, setCity]                           = useState('Mumbai');
  const [startDate, setStartDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]                     = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['Booking.com', 'Agoda']);

  // Elapsed timer
  useEffect(() => {
    if (!isScraping) { setElapsedSec(0); startTimeRef.current = null; return; }
    startTimeRef.current = Date.now();
    const t = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [isScraping]);

  // Poll /api/scrape/status every 2s while scraping
  useEffect(() => {
    if (!isScraping) return;
    const poll = setInterval(async () => {
      try {
        const res  = await fetch('/api/scrape/status');
        const data = await res.json() as ScrapeStatus;
        setStatusData(data);
        setProgress(data.progress ?? 0);
        if (data.logs) setLogs(data.logs);
        if (data.progress >= 100 && data.total > 0) {
          setIsScraping(false);
          toast.success(`Scrape complete — ${data.completed} records processed`);
        }
      } catch { /* silently continue */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [isScraping]);

  const startScrape = async () => {
    try {
      setShowModal(false);
      setIsScraping(true);
      setProgress(0);
      setLogs([]);
      setStatusData(null);

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, startDate, endDate, providers: selectedProviders }),
      });
      if (!res.ok) throw new Error('Failed to start scrape');
      toast.info(`Intelligence job started for ${city}`);
    } catch {
      setIsScraping(false);
      toast.error('Failed to initialize scraper');
    }
  };

  const toggleProvider = (p: string) =>
    setSelectedProviders(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const statusIcon = (s?: string) => {
    if (s === 'success') return <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />;
    if (s === 'failure') return <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />;
    return <Loader2 className="w-3 h-3 animate-spin text-slate-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {/* ── New-Job Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Configuration</p>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">New Intelligence Job</h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* City */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Target Geography</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text" value={city} onChange={e => setCity(e.target.value)}
                        placeholder="SEARCH CITY..."
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold tracking-widest placeholder:text-slate-300 focus:ring-1 focus:ring-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'From', val: startDate, set: setStartDate },
                      { label: 'To',   val: endDate,   set: setEndDate },
                    ].map(f => (
                      <div key={f.label} className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">{f.label}</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input
                            type="date" value={f.val} onChange={e => f.set(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:ring-1 focus:ring-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Providers */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Providers to Audit</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-2">
                      {PROVIDERS.map(p => (
                        <button
                          key={p} onClick={() => toggleProvider(p)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border',
                            selectedProviders.includes(p)
                              ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                          )}
                        >
                          <div className={cn('w-3 h-3 rounded-full flex items-center justify-center border', selectedProviders.includes(p) ? 'bg-white border-white' : 'bg-slate-50 border-slate-200')}>
                            {selectedProviders.includes(p) && <Check className="w-2 h-2 text-slate-900" />}
                          </div>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startScrape}
                  disabled={selectedProviders.length === 0 || !city}
                  className="w-full bg-slate-900 text-white rounded-[1.5rem] py-6 text-[11px] font-black tracking-[0.2em] uppercase hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                >
                  Initiate Global Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Button or Progress Panel ── */}
      {!isScraping && progress === 0 ? (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white rounded-xl px-5 py-2.5 text-[10px] font-black tracking-widest uppercase hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> New Scrape Job
        </button>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Header */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress < 100
                  ? <Activity className="w-4 h-4 animate-pulse text-red-700" />
                  : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                  {progress < 100 ? 'Audit In Progress' : 'Job Completed'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isScraping && (
                  <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatTime(elapsedSec)}
                  </span>
                )}
                <span className="text-[10px] font-black text-slate-900">{progress}%</span>
              </div>
            </div>

            <Progress value={progress} className="h-2 bg-slate-100" />

            {/* Current record */}
            {statusData?.latest && (
              <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-xl">
                {statusIcon(statusData.latest.status)}
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-700 uppercase truncate">
                    {statusData.latest.website || '—'} · {statusData.latest.city || '—'}
                  </p>
                  <p className={cn('text-[8px] font-bold uppercase mt-0.5', statusData.latest.status === 'success' ? 'text-green-600' : statusData.latest.status === 'failure' ? 'text-red-500' : 'text-slate-400')}>
                    {statusData.latest.status || 'Processing'}{statusData.latest.records_inserted ? ` · ${statusData.latest.records_inserted} records` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total',     val: statusData?.total     ?? 0 },
                { label: 'Done',      val: statusData?.completed ?? 0 },
                { label: 'Remaining', val: Math.max(0, (statusData?.total ?? 0) - (statusData?.completed ?? 0)) },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-2">
                  <p className="text-xs font-black text-slate-900">{s.val}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expandable Log */}
          <div className="border-t border-slate-50">
            <button
              onClick={() => setShowLogs(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              <span>Audit Log ({logs.length} entries)</span>
              {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showLogs && (
              <div className="max-h-16 overflow-y-auto px-4 pb-3 space-y-1">
                {logs.length === 0 ? (
                  <p className="text-[8px] text-slate-300 text-center py-3 uppercase">Waiting for first records…</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[7px]', log.status === 'success' ? 'bg-green-50' : log.status === 'failure' ? 'bg-red-50' : 'bg-slate-50')}>
                      {statusIcon(log.status)}
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900 uppercase truncate">{log.website} · {log.city}</p>
                        <p className={cn('font-bold uppercase', log.status === 'success' ? 'text-green-600' : log.status === 'failure' ? 'text-red-500' : 'text-slate-400')}>
                          {log.status}{log.records_inserted ? ` · ${log.records_inserted} rec` : ''}
                          {log.error_message ? ` · ${log.error_message.slice(0, 30)}` : ''}
                        </p>
                      </div>
                      {log.started_at && (
                        <span className="shrink-0 text-slate-300">{new Date(log.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dismiss */}
          {progress >= 100 && (
            <div className="p-4 pt-0">
              <button
                onClick={() => { setProgress(0); setIsScraping(false); setLogs([]); setStatusData(null); }}
                className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
