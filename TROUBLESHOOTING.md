# Troubleshooting Guide - Hotel Price Scraper

## Issue: Getting 500 API Error or "API ERROR: 500"

### Root Causes
This error typically occurs when:
1. **Price data is invalid** - formatters return undefined/null
2. **No hotels are scraped** - Results array is empty
3. **Network timeout** - Puppeteer takes too long
4. **Website blocking** - Booking.com/Agoda blocking bot traffic

### Quick Fix
The latest version includes automatic error handling. If you're still seeing 500 errors:

```bash
# 1. Clear any stale processes
pkill -f "puppeteer\|chrome\|next dev"

# 2. Reinstall dependencies
pnpm install

# 3. Rebuild
pnpm build

# 4. Test with debug endpoint
curl -X POST http://localhost:3000/api/scrape/debug \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai"}'
```

## Issue: Empty Results (No Hotels Found)

### Diagnosis
First, test if the scraper is working:

```bash
# Test individual scraper
curl -X POST http://localhost:3000/api/scrape/debug \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai","checkIn":"2026-05-25","checkOut":"2026-05-26"}'
```

Expected response:
```json
{
  "success": true,
  "hotelCount": 20,
  "hotels": [...]
}
```

### Solution 1: Website Selector Changes
Booking.com, Agoda, and other sites change their HTML structure frequently. If the debug endpoint returns 0 hotels:

**The CSS selectors need updating:**

For Booking.com:
- Open https://www.booking.com
- Search for a city
- Inspect the HTML structure
- Update selectors in `/scripts/scrapers/booking-scraper.ts`

Common selectors that change:
```typescript
// Old (may be outdated)
$('[data-testid="property-card"]')      // Hotel card
$('[data-testid="title"]')              // Hotel name
$('[data-testid="price-and-discounted-price"]')  // Price
```

### Solution 2: Booking.com is Blocking Puppeteer
Some hotels sites detect and block automated traffic:

```typescript
// In base-scraper.ts, add:
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
await page.setViewport({ width: 1280, height: 720 });
await page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml',
});
```

### Solution 3: Use Google Hotels Fallback
The system has Google Hotels as fallback (if Serper API key is set):

```bash
# Set in .env.local
SERPER_API_KEY=your_api_key_here

# Free tier: 100 searches/month
# Get at: https://serper.dev
```

## Issue: Timeout (Takes >60 seconds)

### Problem
Puppeteer navigation is slow. This is normal first time, but can be optimized.

### Solution: Increase Timeout

```typescript
// In app/api/scrape/live/route.ts
export const maxDuration = 180; // Increase to 3 minutes (from 2)
```

Or reduce timeout per scraper:
```typescript
const result = await executeScraperWithTimeout(scraper, params, 60000); // 60s per scraper
```

## Issue: Some Cities Return No Data

### Common Problem Cities
- **Ranchi** - Smaller city, fewer hotels, may take longer
- **Tier 2 cities** - Less hotel inventory, may time out
- **Remote locations** - Booking sites may have limited coverage

### Solution 1: Try Popular Cities First
Test with Mumbai, Delhi, Bangalore:

```bash
curl -X POST http://localhost:3000/api/scrape/live \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai","checkIn":"2026-05-25","checkOut":"2026-05-26"}'
```

### Solution 2: Increase Search Timeout
In the frontend component (`components/hotel-search.tsx`):
```typescript
// Increase timeout
const timer = setTimeout(() => searchHotels(...), 2000); // was 800ms
```

### Solution 3: Check Browser Logs
In development:
```bash
# Terminal 1: Start server
pnpm dev

# Terminal 2: Check Puppeteer output
tail -f .next/dev/logs/next-development.log | grep "\[Booking\]\|\[Agoda\]"
```

## Issue: "Cannot read properties of undefined"

**This is now fixed in latest version.** The error was caused by undefined price values. If you see this:

1. Update to latest code:
```bash
git pull
pnpm install
pnpm dev
```

2. Or manually fix in `/app/api/scrape/live/route.ts`:
```typescript
// Add price validation before using it
if (!hotel.price || typeof hotel.price !== 'number') {
  return false; // Skip invalid prices
}
```

## Issue: High CPU Usage / Slow System

Puppeteer starts a full Chromium browser which is resource-intensive.

### Solution 1: Limit Concurrent Scrapers
```typescript
// Only run 2 at a time instead of all 5
const maxConcurrent = 2;
const chunks = providers.reduce((acc, val, i) => {
  if (i % maxConcurrent === 0) acc.push([]);
  acc[acc.length - 1].push(val);
  return acc;
}, []);

for (const chunk of chunks) {
  await Promise.all(chunk.map(scrape));
}
```

### Solution 2: Use Caching
The system caches results for 10 minutes automatically. Same searches return cached results.

### Solution 3: Use Cloud Version
Deploy to Vercel/Render which have better resources:
```bash
pnpm build
vercel deploy
```

## Issue: Data from Ranchi Processed But Still 500 Error

This specific issue means:
1. **Scraper worked** ✅ (data was processed)
2. **But validation failed** ❌ (prices were invalid)
3. **Or deduplication crashed** ❌ (matcher had bug)

### Debug Steps
1. Check the API response with curl:
```bash
curl -X POST http://localhost:3000/api/scrape/live \
  -H "Content-Type: application/json" \
  -d '{"city":"Ranchi","checkIn":"2026-05-25","checkOut":"2026-05-26"}' | jq .
```

2. Check console for error logs:
```
[v0] Live scrape request for Ranchi
[v0] Starting scraper for Booking.com
[v0] Booking.com: Retrieved 15 hotels
[v0] Price validation: 15 hotels -> X valid
```

3. If validation shows "15 -> 0 valid", all prices are invalid:
   - Check `/lib/price-validator.ts` for validation rules
   - Prices might be 0, 1, 999999 (placeholders)
   - Update MIN_VALID_PRICE / MAX_REASONABLE_PRICE

### Contact Support
If still having issues:

1. **Collect diagnostic info:**
```bash
curl -X POST http://localhost:3000/api/scrape/debug \
  -H "Content-Type: application/json" \
  -d '{"city":"Ranchi"}' > debug.json
```

2. **Share the output** in an issue with:
   - Your city and dates
   - Browser console logs
   - API response
   - Debug endpoint output

## Performance Optimization

### Strategy 1: Use Caching
Already enabled! Results cached for 10 minutes:
```typescript
const cacheKey = generateCacheKey(city, checkIn, checkOut);
await setInCache(cacheKey, responseHotels, 600); // 10 min TTL
```

### Strategy 2: Scheduled Scraping
For popular cities, scrape in background periodically:
```typescript
// Background job - scrape every hour
scheduleJob('0 * * * *', async () => {
  await scrapeCity('Mumbai', tomorrow);
  await scrapeCity('Delhi', tomorrow);
});
```

See `/lib/background-jobs.ts` for implementation.

### Strategy 3: Use Fallback API
Google Hotels API (Serper) is much faster:
```bash
SERPER_API_KEY=your_key pnpm dev
# Will use Google Hotels as primary for speed
```

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Scraper timeout` | Website took >30s to load | Increase timeout or try again |
| `No hotels found` | Website returned empty results | Check city name, try different dates |
| `Cannot read properties of undefined` | Invalid price data | Update latest code |
| `Network error` | Booking.com blocking requests | Add delay, rotate user-agents |
| `ECONNREFUSED` | Server not running | Run `pnpm dev` |
| `Cannot find module` | Missing dependency | Run `pnpm install` |

## Getting Help

1. **Check logs:**
```bash
# Browser console (F12)
# Terminal output during pnpm dev
# /api/scrape/debug endpoint
```

2. **Verify dependencies:**
```bash
pnpm list puppeteer cheerio
```

3. **Test with debug endpoint:**
```bash
curl -X POST http://localhost:3000/api/scrape/debug \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai"}'
```

4. **Rebuild if needed:**
```bash
rm -rf .next node_modules
pnpm install
pnpm dev
```

## Recent Fixes

✅ **Fixed 500 errors** - Added null/undefined price handling
✅ **Added debug endpoint** - Test scrapers individually  
✅ **Better error messages** - Know what went wrong
✅ **Graceful empty results** - Returns [] instead of 500
✅ **Price validation** - Removes invalid placeholder prices

---

**Last updated:** May 17, 2026
**Status:** All known issues resolved
**Next step:** Try the debug endpoint to verify your setup
