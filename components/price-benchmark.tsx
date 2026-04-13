'use client';

import { Hotel, RoomType, PriceHistory } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, Coffee, Utensils, Bed, Building2 } from 'lucide-react';

interface PriceBenchmarkProps {
  myHotel: Hotel | null;
  competitors: Hotel[];
  dateRange: { from: Date; to: Date };
}

export function PriceBenchmark({ myHotel, competitors, dateRange }: PriceBenchmarkProps) {
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (!myHotel) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-[11px] font-black tracking-widest uppercase text-slate-900">Assign Hub Property First</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest max-w-xs mx-auto">
            Benchmark comparisons require a designated baseline inventory record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategic Comparison</p>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            {myHotel.name} <span className="text-slate-300">HUB</span>
          </h2>
        </div>
        <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl tracking-widest border border-slate-100 uppercase">
          {dateRange.from.toLocaleDateString()} — {dateRange.to.toLocaleDateString()}
        </div>
      </div>

      <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="w-[300px] font-black text-[10px] text-slate-400 uppercase tracking-widest px-10 py-6">Inventory & Category</TableHead>
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest py-6">Distribution Source</TableHead>
              <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase tracking-widest py-6">Plan Specification</TableHead>
              <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase tracking-widest py-6">Unit Rate</TableHead>
              <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase tracking-widest py-6">Market Index</TableHead>
              <TableHead className="text-right pr-10 font-black text-[10px] text-slate-400 uppercase tracking-widest py-6">Strategy Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* My Hotel Row */}
            <TableRow className="bg-slate-900 hover:bg-slate-900 border-slate-800">
              <TableCell className="py-8 px-10">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <div>
                    <div className="text-white text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Assigned Property</div>
                    <div className="text-white font-black tracking-tighter text-lg">{myHotel.name}</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                      <Bed className="w-3 h-3" /> Standard Executive
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-white/20 text-white/60 text-[8px] font-black tracking-widest uppercase">{myHotel.lowest_source || 'Default Hub'}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="border-white/10 text-white text-[9px] font-black tracking-widest uppercase py-1 px-3">
                  <Coffee className="w-3 h-3 mr-2 text-white/30" /> Breakfast Incl.
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xl font-black text-white tracking-tighter font-mono uppercase">₹{formatPrice(myHotel.lowest_price || myHotel.price || 0)}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-[9px] font-black text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-widest">Baseline</span>
              </TableCell>
              <TableCell className="text-right pr-10">
                <Minus className="w-4 h-4 ml-auto text-white/20" />
              </TableCell>
            </TableRow>

            {/* Competitor Rows */}
            {competitors.map((hotel) => {
              const myPrice = myHotel.lowest_price || myHotel.price || 0;
              const compPrice = hotel.lowest_price || hotel.price || 0;
              const diffVal = myPrice > 0 ? ((compPrice - myPrice) / myPrice) * 100 : 0;
              const diff = diffVal.toFixed(1);
              const isUnderValue = diffVal < 0; 
              
              return (
                <TableRow key={hotel.id} className="hover:bg-slate-50 border-slate-100 transition-colors">
                  <TableCell className="py-8 px-10">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                      <div>
                        <div className="text-slate-900 font-black tracking-tighter text-lg uppercase">{hotel.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          <Bed className="w-3 h-3" /> Standard Room
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="border-slate-100 text-slate-400 text-[8px] font-black tracking-widest uppercase self-start">
                        {hotel.lowest_source || hotel.source || 'Market'}
                      </Badge>
                      <span className="text-[7px] font-black text-green-600 uppercase tracking-widest">Rate Verified</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Coffee className="w-4 h-4 text-slate-200" />
                      Room Only
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-black text-slate-900 tracking-tighter font-mono">
                      ₹{formatPrice(compPrice)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {!isUnderValue ? (
                      <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3 mr-1" /> PREMIUM
                      </Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-600 border-green-100 text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
                        <TrendingDown className="w-3 h-3 mr-1" /> DISCOUNTED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-10 font-mono">
                    <span className={`text-xs font-black ${diffVal > 0 ? 'text-red-600' : diffVal < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {diffVal > 0 ? '+' : ''}{diff}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

