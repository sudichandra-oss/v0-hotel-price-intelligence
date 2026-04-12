import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

import { getMockDb, saveMockDb } from '@/lib/mock-db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. DB operations will be persisted to data/mock_db.json.');
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function upsertHotel(hotelData: any) {
  if (!supabase) {
    const db = getMockDb();
    const index = db.hotels.findIndex((h: any) => h.hotel_id === hotelData.hotel_id);
    if (index > -1) {
      db.hotels[index] = { ...db.hotels[index], ...hotelData, updated_at: new Date().toISOString() };
    } else {
      db.hotels.push({ id: `mock-${Date.now()}`, ...hotelData, created_at: new Date().toISOString() });
    }
    saveMockDb(db);
    return db.hotels.find((h: any) => h.hotel_id === hotelData.hotel_id);
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
    const db = getMockDb();
    const index = db.room_types.findIndex((r: any) => r.hotel_id === roomData.hotel_id && r.room_name === roomData.room_name);
    if (index > -1) {
      db.room_types[index] = { ...db.room_types[index], ...roomData, updated_at: new Date().toISOString() };
    } else {
      db.room_types.push({ id: `mock-room-${Date.now()}`, ...roomData, created_at: new Date().toISOString() });
    }
    saveMockDb(db);
    return db.room_types.find((r: any) => r.hotel_id === roomData.hotel_id && r.room_name === roomData.room_name);
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
    const db = getMockDb();
    const record = { id: `mock-price-${Date.now()}`, ...priceData, created_at: new Date().toISOString(), scraped_at: new Date().toISOString() };
    db.price_history.push(record);
    saveMockDb(db);
    return [record];
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
    const db = getMockDb();
    const log = { id: `mock-log-${Date.now()}`, started_at: new Date().toISOString(), ...logData };
    db.scrape_logs.push(log);
    saveMockDb(db);
    return log;
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
    const db = getMockDb();
    const index = db.scrape_logs.findIndex((l: any) => l.id === id);
    if (index > -1) {
      db.scrape_logs[index] = { ...db.scrape_logs[index], ...updateData, finished_at: new Date().toISOString() };
      saveMockDb(db);
      return db.scrape_logs[index];
    }
    return null;
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
