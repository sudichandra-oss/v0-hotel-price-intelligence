import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      console.warn('Supabase credentials missing in production!');
    }
    // Return a mock that doesn't throw on common methods
    return new Proxy({} as any, {
      get: (_, prop) => {
        if (prop === 'from') {
          return () => ({
            select: () => ({ 
              order: () => Promise.resolve({ data: [], error: null }),
              limit: () => Promise.resolve({ data: [], error: null }),
              ilike: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
              gte: () => ({ lte: () => ({ gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) }) }) }),
            }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
            upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          });
        }
        return () => Promise.resolve({ data: null, error: null });
      }
    });
  }

  _supabase = createClient(url, key);
  return _supabase;
};

// Export a proxy that looks like the real client but initializes lazily
export const supabase = new Proxy({} as any, {
  get: (_, prop) => {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as ReturnType<typeof createClient>;

export type Hotel = {
  id: string;
  hotel_id: string;
  name: string;
  rating: number;
  review_count: number;
  star_category: number;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  address: string;
  amenities: string[];
  source: string;
  created_at: string;
  updated_at: string;
};

export type RoomType = {
  id: string;
  hotel_id: string;
  room_name: string;
  meal_plan: string;
  base_price: number;
  currency: string;
  capacity: number;
  amenities: string[];
  created_at: string;
  updated_at: string;
};

export type PriceHistory = {
  id: string;
  hotel_id: string;
  room_type_id: string | null;
  stay_date: string;
  price: number;
  currency: string;
  source: string;
  checkin_date: string;
  checkout_date: string;
  scraped_at: string;
  created_at: string;
};

export type PriceAlert = {
  id: string;
  user_id: string | null;
  hotel_id: string;
  alert_type: string;
  threshold: number;
  is_active: boolean;
  created_at: string;
  triggered_at: string | null;
};
