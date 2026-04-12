import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
