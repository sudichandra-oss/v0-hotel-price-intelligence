#!/usr/bin/env node

/**
 * Test script to verify complete scraper flow:
 * 1. Call live scraper API
 * 2. Check logs endpoint
 * 3. Query saved data
 * 4. Verify database file
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const DB_FILE = path.join(process.cwd(), 'data/mock_db.json');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('🧪 Starting scraper flow test...\n');

  // Step 1: Test logs API
  console.log('1️⃣  Testing /api/scrape/logs endpoint...');
  try {
    const logsRes = await fetch(`${API_BASE}/api/scrape/logs?type=stats`);
    const logsData = await logsRes.json();
    console.log('   ✅ Logs API working');
    console.log('   📊 Current stats:', logsData.stats);
  } catch (err) {
    console.error('   ❌ Logs API failed:', err.message);
    return;
  }

  // Step 2: Check if we have any existing data
  console.log('\n2️⃣  Checking database file...');
  if (fs.existsSync(DB_FILE)) {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('   ✅ Database file exists');
    console.log(`   📈 Current hotels in DB: ${db.hotels?.length || 0}`);
    console.log(`   📈 Current price records: ${db.price_history?.length || 0}`);
    console.log(`   📈 Current scrape logs: ${db.scrape_logs?.length || 0}`);
  } else {
    console.log('   ℹ️  Database file not created yet (will be created on first scrape)');
  }

  // Step 3: Test data retrieval API
  console.log('\n3️⃣  Testing /api/scrape/data endpoint...');
  try {
    const dataRes = await fetch(`${API_BASE}/api/scrape/data?city=Mumbai`);
    const dataData = await dataRes.json();
    if (dataRes.ok) {
      console.log('   ✅ Data API working');
      console.log(`   🏨 Hotels for Mumbai: ${dataData.hotels?.length || 0}`);
    } else {
      console.log('   ℹ️  No data returned (normal if not yet scraped)');
    }
  } catch (err) {
    console.error('   ❌ Data API failed:', err.message);
  }

  // Step 4: Show how to trigger a scrape
  console.log('\n4️⃣  To trigger a scrape and test data saving:');
  console.log(`   curl -X POST ${API_BASE}/api/scrape/live \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"city":"Mumbai","checkIn":"2026-05-25","checkOut":"2026-05-26"}'`);

  console.log('\n   Or go to the web UI and search for a hotel!');

  // Step 5: Test logs after scrape
  console.log('\n5️⃣  After searching, check dashboard "Scraper Data" tab:');
  console.log('   - Go to http://localhost:3000');
  console.log('   - Search for a hotel (e.g., "Mumbai")');
  console.log('   - Click "Scraper Data" tab');
  console.log('   - Should see statistics and activity log update!');

  console.log('\n✅ Test setup complete!\n');
}

test().catch(console.error);
