# Data Persistence Guide

Your hotel scraping system now **automatically saves all scraped data** to a local database with real-time dashboards to view everything.

## What Data is Saved?

When you search for hotels, the system saves:

### 1. **Hotels Table**
- Hotel name, address, city, country
- Rating and review count
- Star category and amenities
- Latitude/longitude for mapping
- Lowest price across all sources
- Source breakdown with prices from each provider
- Created/updated timestamps

### 2. **Price History Table**
- Price record for every source
- Currency and meal plan info
- Scraped timestamp
- Hotel reference for tracking changes over time

### 3. **Scrape Logs Table**
- What city was searched
- Check-in and check-out dates
- Which providers were used
- How many hotels found vs saved
- Status (success/partial/failed)
- Exact duration of scrape
- Any errors encountered

## Where Is Data Stored?

The system uses a **mock database** stored at:
```
data/mock_db.json
```

This is a simple JSON file that contains all:
- Hotels scraped
- Price history records
- Scrape activity logs

It's automatically updated every time you search!

## Accessing Saved Data

### Via Dashboard (Easiest)

1. Open your app at http://localhost:3000
2. Go to the **"Scraper Data"** tab
3. See live statistics:
   - Total hotels scraped
   - Total saved to database
   - Unique cities covered
   - Recent activity log
   - Success/failure rates

The dashboard **auto-updates every 10 seconds** showing:
- Real-time statistics
- Recent scrape logs with timestamps
- Source breakdown
- Duration of each scrape

### Via API (Programmatic)

#### Get Scrape Logs & Statistics
```bash
# Get statistics
curl http://localhost:3000/api/scrape/logs?type=stats

# Get recent logs (last 50)
curl http://localhost:3000/api/scrape/logs?type=logs&limit=50
```

Response example:
```json
{
  "success": true,
  "stats": {
    "totalScraped": 150,
    "totalSaved": 145,
    "totalHotels": 145,
    "totalPriceRecords": 580,
    "successfulScrapers": 8,
    "partialScrapers": 2,
    "failedScrapers": 0,
    "uniqueCities": 3,
    "last24hScraped": 45,
    "totalScrapeLogs": 8,
    "lastScrapeTime": "2026-05-17T10:30:45.123Z"
  }
}
```

#### Get Hotels for a Specific City
```bash
# Get all hotels scraped for Mumbai
curl http://localhost:3000/api/scrape/data?city=Mumbai

# Get all hotels scraped for Ranchi
curl http://localhost:3000/api/scrape/data?city=Ranchi
```

Response:
```json
{
  "success": true,
  "city": "Mumbai",
  "count": 25,
  "hotels": [
    {
      "id": "scraped-uuid",
      "hotel_id": "hotel-key",
      "name": "Hotel Name",
      "city": "Mumbai",
      "price": 3500,
      "source": "Booking.com",
      "sourceBreakdown": [
        { "source": "Booking.com", "price": 3500, "currency": "INR" },
        { "source": "Agoda", "price": 3650, "currency": "INR" },
        { "source": "MakeMyTrip", "price": 3400, "currency": "INR" }
      ],
      "lowestPrice": 3400,
      "created_at": "2026-05-17T10:30:00.000Z"
    }
  ]
}
```

#### Get Price History for a Hotel
```bash
# Get price history for a specific hotel
curl "http://localhost:3000/api/scrape/data?hotelId=hotel-key&type=priceHistory"
```

Response:
```json
{
  "success": true,
  "hotelId": "hotel-key",
  "count": 15,
  "priceHistory": [
    {
      "id": "price-uuid",
      "hotel_id": "hotel-key",
      "price": 3500,
      "currency": "INR",
      "source": "Booking.com",
      "scraped_at": "2026-05-17T10:30:00.000Z",
      "created_at": "2026-05-17T10:30:00.000Z"
    }
  ]
}
```

## How Data Flows

```
User Search (e.g., "Hotels in Mumbai, May 25-26")
          ↓
   Live Scraper API
   (/api/scrape/live)
          ↓
Parallel Scraping from:
• Booking.com ✓
• Agoda ✓
• MakeMyTrip ✓
• Expedia ✓
• Google Hotels ✓
          ↓
Data Validation & Deduplication
          ↓
✅ Save to Database:
   - Hotels table
   - Price history
   - Scrape logs
          ↓
Return to User
+ Dashboard Updates
```

## Database Schema

### Hotels Table
```json
{
  "id": "scraped-uuid",
  "hotel_id": "unique-hotel-key",
  "name": "Hotel Name",
  "city": "Mumbai",
  "country": "India",
  "price": 3500,
  "source": "Booking.com",
  "sourceBreakdown": [
    { "source": "Booking.com", "price": 3500, "currency": "INR" },
    { "source": "Agoda", "price": 3650, "currency": "INR" }
  ],
  "rating": 8.5,
  "review_count": 1250,
  "star_category": 4,
  "latitude": 19.08,
  "longitude": 72.88,
  "address": "123 Main St, Mumbai",
  "amenities": ["WiFi", "Parking", "AC"],
  "lowestPrice": 3500,
  "priceCompare": 2,
  "created_at": "2026-05-17T10:30:00.000Z",
  "updated_at": "2026-05-17T10:30:00.000Z"
}
```

### Price History Table
```json
{
  "id": "price-uuid",
  "hotel_id": "unique-hotel-key",
  "price": 3500,
  "currency": "INR",
  "source": "Booking.com",
  "stay_date": "2026-05-25",
  "checkin_date": "2026-05-25",
  "checkout_date": "2026-05-26",
  "scraped_at": "2026-05-17T10:30:00.000Z",
  "created_at": "2026-05-17T10:30:00.000Z"
}
```

### Scrape Logs Table
```json
{
  "id": "log-1726500600000",
  "city": "Mumbai",
  "checkIn": "2026-05-25",
  "checkOut": "2026-05-26",
  "providers": ["Booking.com", "Agoda", "MakeMyTrip", "Expedia"],
  "hotels_found": 25,
  "hotels_saved": 24,
  "sources": ["Booking.com", "Agoda", "MakeMyTrip"],
  "status": "success",
  "started_at": "2026-05-17T10:29:30.000Z",
  "completed_at": "2026-05-17T10:30:45.000Z",
  "duration_ms": 15000,
  "errors": {}
}
```

## Dashboard Features

### Statistics Tab
Shows real-time KPIs:
- **Total Scraped** - All hotels found across all searches
- **Total Saved** - Successfully saved to database
- **Hotels in DB** - Unique hotels currently stored
- **Price Records** - Total price history entries
- **Unique Cities** - Number of different cities searched
- **Last 24h** - Hotels found in past 24 hours
- **Successful** - Number of successful scrapes
- **Partial/Failed** - Number of partial/failed scrapes

### Recent Activity Tab
Table of last 20 scrape logs showing:
- City name
- Hotels found vs saved
- Sources used
- Completion status (✅ success / ⚠️ partial / ❌ failed)
- Time completed
- Click "Refresh" to get latest data

## Example Workflow

1. **User searches**: "Hotels in Mumbai, May 25-26"
2. **System fetches** from all 5 sources (10-30 seconds)
3. **Data is validated** (removes invalid prices)
4. **Hotels are deduplicated** (merges same hotel across sources)
5. **Everything is saved** to database:
   - 25 hotels → hotels table
   - 80 price records → price_history table
   - 1 log entry → scrape_logs table
6. **Dashboard updates** with new stats:
   - Total Scraped: 25
   - Hotels Saved: 24
   - Price Records Added: 80

## Duplicate Prevention

The system **automatically prevents duplicates** by checking:
- **Hotel Name** - Exact match
- **City** - Case-insensitive comparison
- **Hotel ID** - Unique identifier

If the same hotel is found again:
- The price entry is added to history
- Hotel record is updated with latest data
- Source breakdown is merged

## Data Maintenance

### Manual Cleanup
To clear old data (older than 30 days):

```bash
# Via API (not yet exposed, but available in code)
# Edit: lib/scrape-storage.ts -> clearOldData(30)
```

### Automatic Management
- Keeps last **500 scrape logs** automatically
- Stores **unlimited price history** (for tracking)
- Stores **unlimited hotels** (for searching)

## Accessing Data Files

### Direct Access
Edit or view the mock database:
```bash
# View entire database
cat data/mock_db.json

# Pretty print JSON
cat data/mock_db.json | jq '.'

# Count hotels by city
cat data/mock_db.json | jq '.hotels | group_by(.city) | map({city: .[0].city, count: length})'

# Get latest scrape logs
cat data/mock_db.json | jq '.scrape_logs | sort_by(.completed_at) | reverse | .[0:5]'
```

## Troubleshooting

### Dashboard Shows No Data
1. Make sure you've searched for at least one hotel
2. Check browser console for errors (F12)
3. Verify API endpoints work:
   ```bash
   curl http://localhost:3000/api/scrape/logs?type=stats
   ```

### Data Not Saving
1. Check if `/data` folder exists: `ls -la data/`
2. Verify file permissions: `ls -la data/mock_db.json`
3. Check server logs for errors
4. Try a fresh search to generate new data

### Dashboard Auto-Refresh Not Working
1. Refresh the browser page
2. Check browser console for JavaScript errors
3. Ensure JavaScript is enabled

## Next Steps

1. **Monitor**: Use the dashboard to watch scraping activity
2. **Query**: Use APIs to access scraped data
3. **Analyze**: Review price trends and hotel coverage
4. **Expand**: Add more cities to your database
5. **Export**: Use APIs to export data for analysis

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scrape/live` | POST | Scrape hotels live and save data |
| `/api/scrape/logs?type=stats` | GET | Get statistics |
| `/api/scrape/logs?type=logs` | GET | Get scrape logs |
| `/api/scrape/data?city=X` | GET | Get hotels for city |
| `/api/scrape/data?hotelId=X` | GET | Get price history |

All data is persisted automatically! You never have to manually save anything.
