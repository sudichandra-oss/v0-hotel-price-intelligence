'use client';

import { useEffect, useState } from 'react';

interface ScrapStats {
  totalScraped: number;
  totalSaved: number;
  totalHotels: number;
  totalPriceRecords: number;
  successfulScrapers: number;
  partialScrapers: number;
  failedScrapers: number;
  uniqueCities: number;
  last24hScraped: number;
  totalScrapeLogs: number;
  lastScrapeTime: string | null;
}

interface ScrapeLog {
  id: string;
  city: string;
  checkIn: string;
  checkOut: string;
  providers: string[];
  hotels_found: number;
  hotels_saved: number;
  sources: string[];
  status: 'success' | 'partial' | 'failed';
  completed_at: string;
  duration_ms: number;
}

export function ScrapeStats() {
  const [stats, setStats] = useState<ScrapStats | null>(null);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'logs'>('stats');

  useEffect(() => {
    fetchStats();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      console.log('[v0] Fetching stats...');
      const res = await fetch('/api/scrape/logs?type=stats');
      if (!res.ok) {
        console.error('[v0] Stats API returned:', res.status);
        return;
      }
      const data = await res.json();
      console.log('[v0] Stats data received:', data);
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        console.warn('[v0] Stats API returned success=false or no stats');
      }
    } catch (error) {
      console.error('[v0] Error fetching stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      console.log('[v0] Fetching logs...');
      const res = await fetch('/api/scrape/logs?type=logs&limit=20');
      if (!res.ok) {
        console.error('[v0] Logs API returned:', res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      console.log('[v0] Logs data received:', data);
      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        console.warn('[v0] Logs API returned success=false or no logs');
        setLogs([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('[v0] Error fetching logs:', error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Scraping Dashboard</h2>
        <button
          onClick={() => {
            fetchStats();
            fetchLogs();
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-4 text-sm font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'stats' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-sm font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'logs' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'
          }`}
        >
          Recent Activity
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          {loading || !stats ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Loading statistics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Total Scraped
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.totalScraped}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Total Saved
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.totalSaved}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Hotels in DB
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.totalHotels}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Price Records
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.totalPriceRecords}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Unique Cities
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.uniqueCities}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Last 24h
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.last24hScraped}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Successful
            </p>
            <p className="text-2xl font-black text-green-600">{stats.successfulScrapers}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Partial/Failed
            </p>
            <p className="text-2xl font-black text-orange-600">
              {stats.partialScrapers + stats.failedScrapers}
            </p>
          </div>
        </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {loading ? (
            <p className="text-center py-8 text-slate-500">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No scrape logs yet. Start searching for hotels!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-widest text-xs">
                      City
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-widest text-xs">
                      Found / Saved
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-widest text-xs">
                      Sources
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-widest text-xs">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-widest text-xs">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.city}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.hotels_found} / {log.hotels_saved}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex gap-1 flex-wrap">
                          {log.sources.map((source) => (
                            <span
                              key={source}
                              className="inline-block bg-slate-100 rounded-full px-2 py-1 text-xs font-bold text-slate-700"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : log.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {new Date(log.completed_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
