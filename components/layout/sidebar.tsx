'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Terminal, 
  Package, 
  RotateCcw, 
  ShoppingCart, 
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { OrdinaryLogo } from '@/components/ui/ordinary-logo';
import { cn } from '@/lib/utils';

const navItems: { name: string; icon: any; path: string }[] = [];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0">
      <div className="p-8 pb-12">
        <OrdinaryLogo />
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                "flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-slate-100 text-slate-900 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                )} />
                <span className="text-[11px] font-bold tracking-widest uppercase">
                  {item.name}
                </span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
