'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Clock, RefreshCw, CheckCircle2, AlertCircle, TrendingUp, History, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrapeLog {
  id: string;
  city: string;
  website: string;
  status: 'success' | 'failure' | 'in_progress';
  hotels_count: number;
  started_at: string;
}

export function ScraperHealth() {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/scrape/status');
      const data = await res.json();
      // Ensure we sort by latest first in case the API doesn't
      const sortedLogs = (Array.isArray(data) ? data : []).sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      setLogs(sortedLogs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 15 seconds for a "Pulse" feel
    const timer = setInterval(fetchLogs, 15000);
    return () => clearInterval(timer);
  }, []);

  const totalRecords = logs.reduce((sum, log) => sum + (log.hotels_count || 0), 0);

  return (
    <div className="border-t border-slate-50 p-8 space-y-6 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="w-4 h-4 text-slate-900" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Intelligence Pulse</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase">Auto-refreshes every 15s</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-slate-300', loading && 'animate-spin')} />
        </button>
      </div>

      {/* High level pulse metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 opacity-60">
            <History className="w-3 h-3 text-slate-900" />
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Pulses</p>
          </div>
          <p className="text-xl font-black text-slate-900">{logs.length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 opacity-60">
            <TrendingUp className="w-3 h-3 text-slate-900" />
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">New Records</p>
          </div>
          <p className="text-xl font-black text-slate-900">+{totalRecords.toLocaleString()}</p>
        </div>
      </div>

      {/* Pulse Feed */}
      <div className="space-y-4">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Recent Activity</p>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">
          {logs.slice(0, 15).map((log) => (
            <div 
              key={log.id} 
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                log.status === 'in_progress' ? "bg-slate-900 border-slate-900 shadow-lg" : "bg-white border-slate-50"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                log.status === 'success' ? "bg-green-500" : 
                log.status === 'failure' ? "bg-red-500" : "bg-white animate-pulse"
              )} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-[10px] font-black uppercase tracking-tighter truncate", 
                    log.status === 'in_progress' ? "text-white" : "text-slate-900")}>
                    {log.website}
                  </p>
                  <span className={cn("text-[8px] font-bold uppercase", 
                    log.status === 'in_progress' ? "text-white/40" : "text-slate-300")}>
                    {new Date(log.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", 
                    log.status === 'in_progress' ? "text-white/60" : "text-slate-900")}>
                    {log.city}
                  </p>
                  {log.status !== 'in_progress' && (
                    <span className={cn("text-[9px] font-black", 
                      log.status === 'success' ? "text-green-500" : "text-red-500")}>
                      {(log.hotels_count > 0 ? `+${log.hotels_count}` : '')}
                    </span>
                  )}
                  {log.status === 'in_progress' && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1 h-3 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1 h-2 bg-white/20 rounded-full animate-bounce" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
              <Clock className="w-5 h-5 text-slate-100 mx-auto mb-2" />
              <p className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Waiting for pulse...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
