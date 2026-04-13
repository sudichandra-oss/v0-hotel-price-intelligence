'use client';

import { Search, Bell, User, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-10 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full border-[3px] border-slate-900 group relative cursor-pointer">
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-red-800" />
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-6">
        <Button variant="ghost" size="sm" className="gap-2 font-bold text-[10px] tracking-widest rounded-xl hover:bg-slate-50">
          <Globe className="w-4 h-4" />
          EN
        </Button>
        
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-50">
            <Bell className="w-5 h-5 text-slate-900" />
          </Button>
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />
        </div>

        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-50 border border-slate-100">
          <User className="w-5 h-5 text-slate-900" />
        </Button>
      </div>
    </header>
  );
}
