import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Polyfill for Node 18
if (typeof global.File === 'undefined') {
  (global as any).File = class extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options?: any) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. DB operations will be mocked.');
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function upsertHotel(hotelData: any) {
  if (!supabase) {
    console.log('[MOCK] Upserting hotel:', hotelData.name);
    return { id: 'mock-id', ...hotelData };
  }
  const { data, error } = await supabase
    .from('hotels')
    .upsert(hotelData, { onConflict: 'hotel_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting hotel:', error.message);
    throw error;
  }
  return data;
}

export async function upsertRoomType(roomData: any) {
  if (!supabase) {
    console.log('[MOCK] Upserting room type:', roomData.room_name);
    return { id: 'mock-room-id', ...roomData };
  }
  const { data, error } = await supabase
    .from('room_types')
    .upsert(roomData, { onConflict: 'hotel_id,room_name,meal_plan' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting room type:', error.message);
    throw error;
  }
  return data;
}

export async function insertPriceHistory(priceData: any) {
  if (!supabase) {
    console.log('[MOCK] Inserting price history for hotel:', priceData.hotel_id);
    return [{ id: 'mock-price-id', ...priceData }];
  }
  const { data, error } = await supabase
    .from('price_history')
    .upsert(priceData, { onConflict: 'hotel_id,room_type_id,stay_date,source' })
    .select();

  if (error) {
    console.error('Error inserting price history:', error.message);
    throw error;
  }
  return data;
}

export async function logScrape(logData: any) {
  if (!supabase) {
    console.log('[MOCK] Logging scrape:', logData.website);
    return { id: 'mock-log-id', ...logData };
  }
  const { data, error } = await supabase
    .from('scrape_logs')
    .insert([logData])
    .select()
    .single();

  if (error) {
    console.error('Error logging scrape:', error.message);
  }
  return data;
}

export async function updateScrapeLog(id: string, updateData: any) {
  if (!supabase) {
    console.log('[MOCK] Updating scrape log:', id, updateData.status);
    return { id, ...updateData };
  }
  const { data, error } = await supabase
    .from('scrape_logs')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating scrape log:', error.message);
  }
  return data;
}
