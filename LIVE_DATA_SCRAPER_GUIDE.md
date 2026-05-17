# Hotel Price Intelligence - Live Data Scraper Implementation Guide

## Overview

This project has been rebuilt with **real-time hotel price scraping** capabilities. The system now fetches live pricing data from multiple sources (Booking.com, Agoda, MakeMyTrip, Expedia) and Google Hotels API, providing users with current lowest prices and comprehensive price comparisons.

## Key Features Implemented

### 1. Real-Time Scraping API (`/api/scrape/live`)
- **Synchronous scraping** - Users get results immediately (5-30 seconds)
- **Parallel execution** - All scrapers run simultaneously for speed
- **Circuit breaker pattern** - Handles failing scrapers gracefully
- **Timeouts** - 35-second timeout per scraper prevents hanging
- **Data deduplication** - Merges same hotels from multiple sources
- **Price validation** - Removes placeholder/invalid prices

### 2. Multi-Source Hotel Prices
**Primary Scrapers:**
- Booking.com (via Puppeteer)
- Agoda (via Puppeteer)
- MakeMyTrip (via Puppeteer)
- Expedia (via Puppeteer)

**Fallback/Secondary:**
- Google Hotels API (via Serper)

### 3. Price Validation System
Located in `/lib/price-validator.ts`:
- Detects placeholder prices (0, 1, 99, 999, etc.)
- Validates price ranges (100-500,000 INR)
- Converts currencies for comparison
- Calculates price statistics (min, max, avg, median)
- Detects price spikes

### 4. Hotel Deduplication
Located in `/lib/hotel-matcher.ts`:
- Fuzzy string matching for hotel names
- Geographic proximity checking
- Levenshtein distance algorithm for similarity scoring
- Merges duplicate entries automatically

### 5. Enhanced UI
**Hotel Search Component Updates:**
- Check-in and check-out date selectors
- Live search with loading states
- Error handling with user-friendly messages
- Data freshness timestamps
- Source breakdown tables showing all provider prices
- Highlighted lowest price indicator

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hotel Search Component                     │
│  - Date selection (check-in/out)                             │
│  - Live search trigger                                        │
│  - Loading & error states                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              /api/scrape/live (Main Endpoint)                │
│  - Coordinates all scrapers                                  │
│  - Validates prices                                          │
│  - Deduplicates hotels                                       │
│  - Returns aggregated results                                │
└──────┬──────────────────┬───────────────────┬───────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │   Booking    │  │    Agoda     │  │  MakeMyTrip  │
 │  Scraper     │  │  Scraper     │  │  Scraper     │
 │ (Puppeteer)  │  │ (Puppeteer)  │  │ (Puppeteer)  │
 └──────────────┘  └──────────────┘  └──────────────┘
                          │
                          ▼
                  ┌──────────────────┐
                  │  Expedia Scraper │
                  │  (Puppeteer)     │
                  └──────────────────┘
                  
                          │
                          ▼
                  ┌──────────────────┐
                  │ Google Hotels    │
                  │ Scraper (Serper) │
                  │ (Fallback)       │
                  └──────────────────┘
```

## Setup Instructions

### 1. Install Dependencies
All required dependencies are already in `package.json`. Make sure they're installed:

```bash
pnpm install
# or npm install / yarn install
```

### 2. Configure Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

**For Google Hotels fallback (optional but recommended):**
1. Visit https://serper.dev
2. Sign up for a free account (100 searches/month free)
3. Copy your API key
4. Add to `.env.local`:
   ```
   SERPER_API_KEY=your_api_key_here
   ```

**For debugging/monitoring:**
```
DEBUG_LOGGING=true
NODE_ENV=development
```

### 3. Run the Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### 4. Test Live Scraping

1. Type a city name (e.g., "Mumbai", "London", "Goa")
2. Select check-in and check-out dates
3. The search automatically triggers after 800ms
4. **Watch the loading spinner** - the system is fetching live data
5. Results show all hotels with source breakdowns and lowest prices

## How It Works

### Search Flow

```
User inputs city + dates
        ↓
Hotel Search Component detects change
        ↓
Calls /api/scrape/live (POST)
        ↓
Live Scraper coordinates all providers:
  ├─ Booking.com scraper (35s timeout)
  ├─ Agoda scraper (35s timeout)
  ├─ MakeMyTrip scraper (35s timeout)
  ├─ Expedia scraper (35s timeout)
  └─ Google Hotels (30s timeout, if others fail)
        ↓
All results aggregated in parallel
        ↓
Price validation (remove invalid prices)
        ↓
Hotel deduplication (merge same hotels)
        ↓
Sort by lowest price
        ↓
Group source breakdown
        ↓
Return results to component
        ↓
Display hotels with all source prices
```

### Price Data Structure

Each hotel includes:
```typescript
{
  hotel_id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  review_count: number;
  source: string;
  price: number; // Lowest price across sources
  lowestPrice: number;
  priceCompare: number; // Number of sources
  sourceBreakdown: [
    {
      source: string;     // 'booking', 'agoda', 'google', etc.
      price: number;      // Price from this source
      currency: string;   // 'INR', 'USD', etc.
      meal_plan: string;
      timestamp: string;  // When this price was fetched
    }
  ]
}
```

## API Endpoints

### POST /api/scrape/live
**Real-time hotel scraping endpoint**

Request:
```json
{
  "city": "Mumbai",
  "checkIn": "2026-05-25",
  "checkOut": "2026-05-26",
  "providers": ["Booking.com", "Agoda", "MakeMyTrip", "Expedia"]
}
```

Response:
```json
{
  "success": true,
  "hotels": [...],
  "sources": ["Booking.com", "Agoda"],
  "fetchedAt": "2026-05-17T10:30:45.123Z",
  "errors": {
    "Expedia": "Timeout"
  }
}
```

### GET /api/hotels
**Backward compatible endpoint (delegates to /api/scrape/live)**

Query params:
- `city` (required): City name
- `checkIn` (optional): Check-in date (YYYY-MM-DD)
- `checkOut` (optional): Check-out date (YYYY-MM-DD)
- `star` (optional): Star categories (e.g., "3,4,5")

## Data Flow & File Structure

```
Project Root
├── app/
│   └── api/
│       ├── scrape/
│       │   └── live/
│       │       └── route.ts          (Main real-time scraping endpoint)
│       └── hotels/
│           └── route.ts              (Backward compatible endpoint)
│
├── scripts/
│   └── scrapers/
│       ├── booking-scraper.ts        (Booking.com scraper)
│       ├── agoda-scraper.ts          (Agoda scraper)
│       ├── makemytrips-scraper.ts    (MakeMyTrip scraper)
│       ├── expedia-scraper.ts        (Expedia scraper)
│       ├── google-scraper.ts         (Google Hotels/Serper scraper)
│       ├── base-scraper.ts           (Base class for all scrapers)
│       └── utils/
│           ├── formatter.ts          (Price/rating formatting)
│           └── db-client.ts          (Database utilities)
│
├── lib/
│   ├── price-validator.ts            (Price validation & conversion)
│   ├── hotel-matcher.ts              (Deduplication & fuzzy matching)
│   └── supabase.ts                   (Database client)
│
└── components/
    └── hotel-search.tsx              (Main search UI component)
```

## Key Implementation Details

### Real-Time vs Background
- **Old system**: Scrapers ran in background, API returned immediately with no data
- **New system**: API waits for scrapers to complete (with timeouts), returns actual data

### Error Handling
- If one scraper fails, others continue
- Timeout after 35 seconds per scraper
- Google Hotels API acts as automatic fallback
- Graceful degradation - returns partial results rather than failing

### Performance
- All scrapers execute in **parallel** (Promise.allSettled)
- Typical response time: 8-30 seconds depending on source responsiveness
- Users see loading spinner during fetch
- Data freshness timestamp shows when results were fetched

### Data Quality
1. **Validation**: Invalid prices filtered out
2. **Deduplication**: Same hotel identified across sources
3. **Sorting**: Results sorted by lowest price
4. **Transparency**: All source prices shown in breakdown

## Troubleshooting

### No hotels are returned
1. Check browser console for error messages
2. Verify city name spelling is correct
3. Check that dates are in the future
4. Try a major city (Mumbai, Delhi, London) first
5. Check server logs: `npm run dev` output

### Timeout errors
- Network may be slow
- Try again in a few seconds
- Check if website's structure changed (may need scraper update)

### Google Hotels not working
- `SERPER_API_KEY` not set in `.env.local`
- API key quota exceeded (free tier: 100/month)
- Serper API may be down (rare)

### Browser showing old data
- Clear cache and reload
- Make sure you're hitting the live endpoint
- Check that dates changed to trigger new search

## Future Enhancements

### Phase 5: Caching (Optional)
- Redis caching with 5-15 minute TTL
- Reduce API calls for popular cities

### Phase 6: Background Jobs
- Scheduled scraping every 2-6 hours
- Update price history for trending cities

### Phase 7: Real-Time Updates
- WebSocket/SSE for live price changes
- User notifications on price drops

### Phase 8: Analytics
- Track price trends over time
- User search patterns
- Provider performance metrics

## Common Code Patterns

### Using the Price Validator
```typescript
import { validatePrice, convertPrice, getLowestPrice } from '@/lib/price-validator';

// Validate a price
const validation = validatePrice('₹5,000', 'booking');
if (validation.isValid) {
  console.log('Valid price:', validation.price);
}

// Convert currency
const inrPrice = convertPrice(100, 'USD', 'INR'); // ~8300

// Get lowest price from multiple sources
const lowest = getLowestPrice([
  { price: 5000, currency: 'INR', source: 'booking' },
  { price: 60, currency: 'USD', source: 'agoda' }
]); // { lowestPrice: 4980, source: 'agoda', ... }
```

### Using the Hotel Matcher
```typescript
import { deduplicateHotels, stringSimilarity } from '@/lib/hotel-matcher';

// Deduplicate hotels
const groups = deduplicateHotels(hotelArray);
// Returns HotelGroup[] with sourceBreakdown

// String similarity
const similarity = stringSimilarity('Hotel Mumbai', 'Hotel Mumbai Beach');
// Returns 0-1 score
```

## API Response Examples

### Successful Response
```json
{
  "success": true,
  "hotels": [
    {
      "hotel_id": "luxury-suite-mumbai",
      "name": "Luxury Suite Hotel",
      "city": "Mumbai",
      "price": 3500,
      "lowestPrice": 3500,
      "rating": 4.5,
      "sourceBreakdown": [
        {
          "source": "agoda",
          "price": 3500,
          "currency": "INR",
          "timestamp": "2026-05-17T10:30:45Z"
        },
        {
          "source": "booking",
          "price": 3800,
          "currency": "INR",
          "timestamp": "2026-05-17T10:30:45Z"
        }
      ]
    }
  ],
  "sources": ["Booking.com", "Agoda"],
  "fetchedAt": "2026-05-17T10:30:45.123Z"
}
```

### Partial Success (Some sources failed)
```json
{
  "success": false,
  "hotels": [
    // ... hotels from Booking and Agoda
  ],
  "sources": ["Booking.com", "Agoda"],
  "fetchedAt": "2026-05-17T10:30:45.123Z",
  "errors": {
    "MakeMyTrip": "Request timeout",
    "Expedia": "Page load failed"
  }
}
```

## Monitoring & Debugging

### Enable Debug Logging
Set in `.env.local`:
```
DEBUG_LOGGING=true
```

Then in the API route, check logs:
```
npm run dev
```

You'll see output like:
```
[v0] Live scrape request for Mumbai
[v0] Booking.com: Retrieved 15 hotels
[v0] Agoda: Retrieved 18 hotels
[v0] MakeMyTrip: Scraper timeout
[v0] Live scrape completed: 28 unique hotels from Booking.com, Agoda
```

## Testing Checklist

- [ ] Search for a city
- [ ] See loading spinner during fetch
- [ ] Results show hotels with multiple sources
- [ ] Lowest price is highlighted
- [ ] Source breakdown table is visible
- [ ] Data freshness timestamp is shown
- [ ] Try different dates
- [ ] Try different star filters
- [ ] Check error handling (disconnect network, see error message)

## Support & Issues

If you encounter issues:

1. **Check the console** - browser console shows client-side errors
2. **Check server logs** - `npm run dev` shows server-side errors
3. **Enable debug logging** - set `DEBUG_LOGGING=true`
4. **Try a different city** - some may have scraper issues
5. **Wait a moment** - scrapers take 10-30 seconds

## License

This implementation is part of the Hotel Price Intelligence system.
