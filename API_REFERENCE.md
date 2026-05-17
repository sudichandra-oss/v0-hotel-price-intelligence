# Hotel Price Intelligence - API Reference

## Endpoints

### POST /api/scrape/live
Real-time hotel price scraping from multiple sources.

**Request:**
```json
{
  "city": "Mumbai",
  "checkIn": "2026-05-25",
  "checkOut": "2026-05-26",
  "providers": ["Booking.com", "Agoda", "MakeMyTrip", "Expedia"],
  "forceRefresh": false
}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| city | string | Yes | City name (e.g., "Mumbai", "London") |
| checkIn | string | Yes | Check-in date (YYYY-MM-DD) |
| checkOut | string | Yes | Check-out date (YYYY-MM-DD) |
| providers | string[] | No | List of providers to scrape (default: all) |
| forceRefresh | boolean | No | Skip cache and fetch fresh data |

**Response (Success):**
```json
{
  "success": true,
  "hotels": [
    {
      "hotel_id": "luxury-suite-mumbai",
      "name": "Luxury Suite Hotel",
      "address": "123 Marine Drive, Mumbai",
      "city": "Mumbai",
      "country": "India",
      "rating": 4.5,
      "review_count": 2500,
      "star_category": "5",
      "latitude": 19.08,
      "longitude": 72.88,
      "source": "agoda",
      "price": 3500,
      "currency": "INR",
      "lowestPrice": 3500,
      "priceCompare": 3,
      "timestamp": "2026-05-17T10:30:45.123Z",
      "sourceBreakdown": [
        {
          "source": "agoda",
          "price": 3500,
          "currency": "INR",
          "meal_plan": "Breakfast included",
          "timestamp": "2026-05-17T10:30:45.123Z"
        },
        {
          "source": "booking",
          "price": 3800,
          "currency": "INR",
          "meal_plan": "Room only",
          "timestamp": "2026-05-17T10:30:45.123Z"
        },
        {
          "source": "makemytrip",
          "price": 3650,
          "currency": "INR",
          "meal_plan": "Breakfast included",
          "timestamp": "2026-05-17T10:30:45.123Z"
        }
      ]
    }
  ],
  "sources": ["Booking.com", "Agoda", "MakeMyTrip"],
  "fetchedAt": "2026-05-17T10:30:45.123Z",
  "errors": {}
}
```

**Response (Partial Success):**
```json
{
  "success": false,
  "hotels": [...],
  "sources": ["Booking.com", "Agoda"],
  "fetchedAt": "2026-05-17T10:30:45.123Z",
  "errors": {
    "Expedia": "Request timeout",
    "MakeMyTrip": "Page load failed"
  }
}
```

**Status Codes:**
- `200 OK` - Scraping completed (with or without errors)
- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - Critical failure

**Response Time:**
- With cache: < 100ms
- Without cache: 10-30 seconds
- Maximum timeout: 120 seconds

---

### GET /api/hotels
Backward-compatible hotel search endpoint (delegates to `/api/scrape/live`).

**Request:**
```
GET /api/hotels?city=Mumbai&checkIn=2026-05-25&checkOut=2026-05-26&star=3,4,5
```

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| city | string | Yes | City name |
| checkIn | string | No | Check-in date (default: today) |
| checkOut | string | No | Check-out date (default: tomorrow) |
| star | string | No | Comma-separated star ratings (e.g., "3,4,5") |

**Response:**
```json
[
  {
    "hotel_id": "...",
    "name": "...",
    "price": 3500,
    "sourceBreakdown": [...]
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing city parameter
- `500 Internal Server Error` - Server error

---

## Data Types

### Hotel Object
```typescript
{
  hotel_id: string;              // Unique ID
  name: string;                  // Hotel name
  address: string;               // Full address
  city: string;                  // City name
  country: string;               // Country name
  rating: number;                // Guest rating (0-5)
  review_count: number;          // Number of reviews
  star_category: string;         // Star rating ("1"-"5")
  latitude: number;              // Geographic latitude
  longitude: number;             // Geographic longitude
  source: string;                // Primary source
  price: number;                 // Lowest price (INR)
  currency: string;              // Currency code
  lowestPrice: number;           // Same as price
  priceCompare: number;          // Number of sources compared
  timestamp: string;             // ISO timestamp
  sourceBreakdown: PriceBreakdown[];
  meal_plan?: string;            // Meal plan details
}
```

### PriceBreakdown Object
```typescript
{
  source: string;                // Provider name
  price: number;                 // Price in original currency
  currency: string;              // Currency code
  meal_plan?: string;            // Meal plan info
  timestamp: string;             // When fetched
}
```

### Error Response
```typescript
{
  error: string;                 // Error message
  message?: string;              // Additional details
  status: number;                // HTTP status
}
```

---

## Examples

### Example 1: Search for hotels in Mumbai
```bash
curl -X POST http://localhost:3000/api/scrape/live \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Mumbai",
    "checkIn": "2026-05-25",
    "checkOut": "2026-05-26"
  }'
```

### Example 2: Force refresh (bypass cache)
```bash
curl -X POST http://localhost:3000/api/scrape/live \
  -H "Content-Type: application/json" \
  -d '{
    "city": "London",
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-02",
    "forceRefresh": true
  }'
```

### Example 3: Specific providers only
```bash
curl -X POST http://localhost:3000/api/scrape/live \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Goa",
    "checkIn": "2026-07-01",
    "checkOut": "2026-07-02",
    "providers": ["Booking.com", "Agoda"]
  }'
```

### Example 4: Filter by star rating
```bash
curl http://localhost:3000/api/hotels?city=Delhi&star=4,5
```

---

## Rate Limits

Not enforced by default. Consider implementing:

**Production Recommendations:**
- Per IP: 10 requests/minute
- Per user: 20 requests/minute
- Cache TTL: 5-15 minutes

---

## Error Codes

### Client Errors (4xx)

**400 Bad Request**
```json
{
  "error": "Missing required parameters",
  "details": "city parameter is required"
}
```

Causes:
- Missing city parameter
- Invalid date format (use YYYY-MM-DD)
- Invalid star ratings

### Server Errors (5xx)

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Failed to scrape hotels"
}
```

Causes:
- All scrapers failed
- Database connection error
- Memory issues

---

## Response Headers

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 1024
X-Cache: HIT | MISS
X-Cache-TTL: 600
X-Response-Time: 125ms
```

---

## Best Practices

### 1. Handle Partial Failures
```javascript
const response = await fetch('/api/scrape/live', { ... });
const data = await response.json();

// Some sources may have failed
if (!data.success) {
  console.warn('Some sources failed:', data.errors);
}

// But we still got hotels from available sources
if (data.hotels && data.hotels.length > 0) {
  // Use the results
}
```

### 2. Implement Retry Logic
```javascript
async function searchWithRetry(city, checkIn, checkOut, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/scrape/live', {
        method: 'POST',
        body: JSON.stringify({ city, checkIn, checkOut })
      });
      
      if (response.ok) return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
    }
  }
}
```

### 3. Cache Results Client-Side
```javascript
const cache = new Map();

async function getCachedHotels(city, checkIn, checkOut) {
  const key = `${city}:${checkIn}:${checkOut}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const response = await fetch('/api/scrape/live', ...);
  const data = await response.json();
  
  // Cache for 10 minutes
  cache.set(key, data);
  setTimeout(() => cache.delete(key), 600000);
  
  return data;
}
```

### 4. Handle Loading States
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [hotels, setHotels] = useState([]);

async function search(city, checkIn, checkOut) {
  setLoading(true);
  setError('');
  
  try {
    const response = await fetch('/api/scrape/live', ...);
    const data = await response.json();
    
    if (data.hotels && data.hotels.length > 0) {
      setHotels(data.hotels);
    } else {
      setError('No hotels found');
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

---

## Authentication

Currently no authentication required. Consider adding:
- API key validation
- Rate limiting per key
- Usage tracking
- Quota management

---

## Monitoring

### Metrics to Track
- Scrape success rate
- Average response time
- Timeout frequency
- Price accuracy
- Cache hit rate

### Logging
Enable in `.env.local`:
```
DEBUG_LOGGING=true
```

Logs appear in `pnpm dev` output.

---

## Versioning

Current API: v1 (not versioned in URL)

Future: Consider versioning at `/api/v2/scrape/live` for breaking changes.

---

## CORS

If calling from browser:
- Same origin: Works out of the box
- Cross origin: Configure CORS headers in Next.js middleware

---

## Webhooks (Future)

Planned for price change notifications:
- Register webhook URL
- Receive POST when prices drop
- Retry on failure

---

## GraphQL (Future)

Consider GraphQL for more flexible querying:
- Filter by price range
- Sort by rating
- Aggregate statistics

---

## Support

- See `LIVE_DATA_SCRAPER_GUIDE.md` for full documentation
- Check browser console for client errors
- Check `pnpm dev` output for server errors
- Enable `DEBUG_LOGGING=true` for detailed logs
