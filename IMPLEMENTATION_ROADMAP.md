# Hotel Price Intelligence - Implementation Roadmap & Action Plan

## Executive Summary

**Current System Status:** Beta (Not production-ready)  
**Target Deployment:** Week 4  
**Resource Requirement:** 1 Backend + 1 Frontend + 1 DevOps Engineer  
**Estimated Effort:** 100-120 hours

---

## Phase 1: Critical Stabilization (Weeks 1-2)

### 1.1 Fix Data Persistence (Priority: CRITICAL)

**Issue:** Data saved to JSON file but not retrievable correctly on dashboard

**Solution:**
```typescript
// lib/scrape-storage.ts - Improved save function with verification
export function saveScrapedHotels(hotels: HotelPrice[]): number {
  const db = getMockDb();
  
  if (!db.hotels) db.hotels = [];
  if (!db.price_history) db.price_history = [];
  
  let savedCount = 0;
  const timestamp = new Date().toISOString();
  
  hotels.forEach((hotel) => {
    // Validate hotel data before saving
    if (!validateHotel(hotel)) return;
    
    // Check for duplicates
    const existing = db.hotels.find(
      (h) => h.name.toLowerCase() === hotel.name.toLowerCase() 
      && h.city.toLowerCase() === hotel.city.toLowerCase()
    );
    
    if (existing) {
      // Update existing
      existing.price = hotel.price;
      existing.source = hotel.source;
      existing.updated_at = timestamp;
    } else {
      // Add new
      db.hotels.push({
        id: `hotel-${Date.now()}-${Math.random()}`,
        name: hotel.name,
        city: hotel.city,
        price: hotel.price,
        source: hotel.source,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    
    // Save price history
    db.price_history.push({
      hotel_id: existing?.id || `hotel-${Date.now()}`,
      price: hotel.price,
      source: hotel.source,
      timestamp,
    });
    
    savedCount++;
  });
  
  // Atomic write with backup
  const backupPath = `${dbPath}.backup`;
  fs.copyFileSync(dbPath, backupPath);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  
  return savedCount;
}
```

**Testing:**
```typescript
// __tests__/scrape-storage.test.ts
describe('saveScrapedHotels', () => {
  it('should save valid hotels', () => {
    const hotels = [{ name: 'Hotel A', price: 100, ... }];
    const count = saveScrapedHotels(hotels);
    expect(count).toBe(1);
    expect(getScrapeStats().totalHotels).toBe(1);
  });
  
  it('should handle duplicates', () => {
    saveScrapedHotels([{ name: 'Hotel A', price: 100 }]);
    saveScrapedHotels([{ name: 'Hotel A', price: 120 }]);
    expect(getScrapeStats().totalHotels).toBe(1); // Not 2
  });
});
```

**Acceptance Criteria:**
- ✅ All inserted data appears in database
- ✅ Statistics match database contents
- ✅ No duplicate records created
- ✅ Test passes for concurrent writes

---

### 1.2 Fix Scraper Reliability (Priority: CRITICAL)

**Current Success Rate:** ~40%  
**Target:** >80%

**Issue 1: Browser Not Closing**
```typescript
// BEFORE - Memory leak risk
async fetchWithPuppeteer(url: string) {
  const browser = await puppeteer.launch(options);
  try {
    // ... code ...
    return html;
  } catch (error) {
    await browser.close(); // Only closes on error
    throw error;
  }
  // If no error, browser never closes!
}

// AFTER - Always close
async fetchWithPuppeteer(url: string) {
  const browser = await puppeteer.launch(options);
  let page;
  try {
    page = await browser.newPage();
    // ... code ...
    return html;
  } finally {
    try {
      if (page) await page.close();
    } catch (e) { /* ignore */ }
    try {
      await browser.close();
    } catch (e) { /* ignore */ }
  }
}
```

**Issue 2: Selector Fragility**
```typescript
// BEFORE - Single selector, fails silently
const hotels = $(selectors.hotelCard).map((i, el) => ({
  name: $(el).find('.hotel-name').text(),
  price: parseFloat($(el).find('.price').text()),
})).get();
// Returns empty array if selector changes

// AFTER - Fallback selectors
function extractHotels($: CheerioAPI): Hotel[] {
  const selectorOptions = [
    { name: '.sr-hotel-name', price: '.sr-strike' },  // Current
    { name: '.h2.title', price: '.price-text' },      // Fallback 1
    { name: '[data-testid="hotel-name"]', price: '[data-testid="hotel-price"]' }, // Fallback 2
  ];
  
  for (const selectors of selectorOptions) {
    const hotels = $(selectors.name)
      .map((i, el) => ({
        name: $(el).text().trim(),
        price: parseInt($(el).closest('[data-hotel]').find(selectors.price).text()),
      }))
      .get()
      .filter(h => h.name && h.price);
    
    if (hotels.length > 0) {
      console.log(`[${this.websiteName}] Using selector option: ${selectorOptions.indexOf(selectors)}`);
      return hotels;
    }
  }
  
  console.warn(`[${this.websiteName}] All selectors failed`);
  return [];
}
```

**Issue 3: No Rate Limit Handling**
```typescript
// AFTER - Exponential backoff + circuit breaker
async executeWithRetry(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fn();
      return response;
    } catch (error: any) {
      const status = error.status || 0;
      
      // 429 = Rate limited, 503 = Service unavailable
      if (status === 429 || status === 503) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Rate limited. Backing off ${backoffMs}ms`);
        await delay(backoffMs);
        continue;
      }
      
      // Other errors, re-throw
      throw error;
    }
  }
}
```

---

### 1.3 Fix Dashboard Data Display (Priority: CRITICAL)

**Issue:** Statistics show null/undefined values

**Status:** Partially fixed in previous commits

**Remaining Tasks:**
```typescript
// components/scrape-stats.tsx - Ensure all values display

const StatsCard = ({ label, value, unit = '' }) => (
  <div className="bg-white rounded-lg p-4 border border-slate-100">
    <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
    <p className="text-3xl font-black text-slate-900 mt-2">
      {value ?? 0}{unit}
    </p>
  </div>
);

// Usage
<StatsCard label="Hotels Scraped" value={stats?.totalScraped ?? 0} />
```

**Test:**
1. Search for "Mumbai"
2. Wait for completion
3. Go to "Scraper Data" tab
4. Verify all stats show numbers (not blank)
5. Verify "Total Scraped" and "Total Saved" match

---

### 1.4 Add Input Validation & Security (Priority: HIGH)

**Issue:** No validation, vulnerable to XSS/DoS

**Solution:**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const ScrapeRequestSchema = z.object({
  city: z.string()
    .min(2, 'City name too short')
    .max(50, 'City name too long')
    .regex(/^[a-zA-Z\s-]+$/, 'Invalid characters'),
  checkIn: z.string().datetime('Invalid date format'),
  checkOut: z.string().datetime('Invalid date format'),
  providers: z.array(
    z.enum(['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia', 'Google'])
  ),
});

// Use in API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ScrapeRequestSchema.parse(body);
    // ... safe to use now
  } catch (error: any) {
    return NextResponse.json(
      { error: error.issues },
      { status: 400 }
    );
  }
}
```

**Rate Limiting:**
```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 per minute
});

export async function rateLimitMiddleware(req: NextRequest) {
  const ip = req.ip || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new NextResponse('Rate limited', { status: 429 });
  }
}
```

---

## Phase 2: Production Readiness (Weeks 3-4)

### 2.1 Database Migration to PostgreSQL

**Schema Design:**
```sql
-- Hotels table
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  rating DECIMAL(3,2),
  review_count INT,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, city)
);

CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_updated_at ON hotels(updated_at DESC);

-- Price history table
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) NOT NULL,
  meal_plan VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  UNIQUE(hotel_id, source, timestamp)
);

CREATE INDEX idx_price_hotel_id ON price_history(hotel_id);
CREATE INDEX idx_price_timestamp ON price_history(timestamp DESC);

-- Scrape logs table
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  providers JSONB,
  hotels_found INT DEFAULT 0,
  hotels_saved INT DEFAULT 0,
  sources JSONB,
  status VARCHAR(20), -- success, partial, failed
  errors JSONB,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_logs_city_timestamp ON scrape_logs(city, completed_at DESC);
```

**Migration Script:**
```typescript
// scripts/migrate-to-postgres.ts
import { Pool } from 'pg';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    // Get mock data
    const mockDb = getMockDb();
    
    // Insert hotels
    for (const hotel of mockDb.hotels) {
      await client.query(
        'INSERT INTO hotels (name, city, source) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [hotel.name, hotel.city, hotel.source]
      );
    }
    
    // Insert price history
    for (const price of mockDb.price_history) {
      await client.query(
        'INSERT INTO price_history (hotel_id, price, source, timestamp) VALUES (...)',
        [...]
      );
    }
    
    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
```

**Update Application:**
```typescript
// lib/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pooling
});

export async function getHotels(city: string) {
  const result = await pool.query(
    'SELECT * FROM hotels WHERE city = $1 LIMIT 50',
    [city]
  );
  return result.rows;
}

export async function saveHotel(hotel: Hotel) {
  await pool.query(
    `INSERT INTO hotels (name, city, source) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (name, city) DO UPDATE 
     SET updated_at = NOW()`,
    [hotel.name, hotel.city, hotel.source]
  );
}
```

---

### 2.2 Structured Logging Implementation

**Setup:**
```bash
npm install winston winston-daily-rotate-file
```

**Logger Configuration:**
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'hotel-scraper' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

**Usage:**
```typescript
// In scraper
logger.info('scrape_started', {
  city: 'Mumbai',
  providers: ['Booking.com'],
  requestId: req.id,
});

logger.error('scrape_failed', {
  city: 'Mumbai',
  provider: 'Booking.com',
  error: error.message,
  duration: 5000,
  requestId: req.id,
});
```

---

### 2.3 Comprehensive Testing

**Unit Tests:**
```typescript
// __tests__/price-validator.test.ts
import { validatePrice, getLowestPrice } from '@/lib/price-validator';

describe('Price Validation', () => {
  it('should reject negative prices', () => {
    const result = validatePrice('-100', 'Booking', new Date());
    expect(result.isValid).toBe(false);
  });
  
  it('should accept valid prices', () => {
    const result = validatePrice('2500', 'Booking', new Date());
    expect(result.isValid).toBe(true);
    expect(result.normalizedPrice).toBe(2500);
  });
});

// __tests__/hotel-matcher.test.ts
describe('Hotel Deduplication', () => {
  it('should match similar names', () => {
    const hotels = [
      { name: 'Taj Hotel Mumbai', city: 'Mumbai' },
      { name: 'TAJ HOTEL MUMBAI', city: 'Mumbai' },
    ];
    const unique = deduplicateHotels(hotels);
    expect(unique).toHaveLength(1);
  });
});
```

**Integration Tests:**
```typescript
// __tests__/api/scrape-live.test.ts
describe('POST /api/scrape/live', () => {
  it('should return hotels for valid city', async () => {
    const response = await fetch('http://localhost:3000/api/scrape/live', {
      method: 'POST',
      body: JSON.stringify({
        city: 'Mumbai',
        checkIn: '2026-06-01',
        checkOut: '2026-06-02',
      }),
    });
    
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.hotels).toBeInstanceOf(Array);
    expect(data.hotels.length).toBeGreaterThan(0);
  });
});
```

---

## Phase 3: Feature Enhancement (Weeks 5-8)

### 3.1 Real-Time Updates with WebSocket

**Setup:**
```bash
npm install next-ws ws
```

**Server Implementation:**
```typescript
// app/api/ws/route.ts
import { WebSocketHandler } from 'next-ws/server';

const handler = new WebSocketHandler();

handler.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'subscribe_city') {
      socket.join(`city:${data.city}`);
    }
  });
});

export const GET = handler;
```

**Broadcasting on Scrape:**
```typescript
// When scrape completes, broadcast to subscribed clients
io.to(`city:Mumbai`).emit('hotels_updated', {
  city: 'Mumbai',
  hotels: [hotel1, hotel2, ...],
  timestamp: new Date(),
});
```

**Client Connection:**
```typescript
// components/hotel-search.tsx
const connectWebSocket = () => {
  const ws = new WebSocket('ws://localhost:3000/api/ws');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe_city',
      city: searchCity,
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'hotels_updated') {
      setHotels(data.hotels);
    }
  };
};
```

---

### 3.2 Price Trend Visualization

**Data Aggregation:**
```typescript
// lib/price-analytics.ts
export function calculateTrends(priceHistory: PriceRecord[]) {
  const grouped = groupBy(priceHistory, 'timestamp');
  
  return {
    hourly: grouped.map(g => ({
      timestamp: g.timestamp,
      avgPrice: mean(g.prices),
      minPrice: min(g.prices),
      maxPrice: max(g.prices),
    })),
    trend: calculateTrendDirection(grouped),
    volatility: calculateVolatility(grouped),
    recommendation: getPriceRecommendation(grouped),
  };
}
```

**React Component:**
```typescript
// components/price-trend-chart.tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

export function PriceTrendChart({ hotelId }: { hotelId: string }) {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const prices = getPriceHistoryFor(hotelId);
    setData(calculateTrends(prices));
  }, [hotelId]);
  
  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="timestamp" />
      <YAxis />
      <Line type="monotone" dataKey="avgPrice" stroke="#8884d8" />
      <Line type="monotone" dataKey="minPrice" stroke="#82ca9d" />
    </LineChart>
  );
}
```

---

## Phase 4: Scalability & Performance (Weeks 9-12)

### 4.1 Browser Pooling

**Setup:**
```bash
npm install puppeteer-cluster
```

**Implementation:**
```typescript
// scripts/scrapers/browser-pool.ts
import { Cluster } from 'puppeteer-cluster';

let cluster: Cluster<any>;

export async function initBrowserPool() {
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 3,
    puppeteerOptions: {
      headless: true,
      args: ['--no-sandbox'],
    },
  });
  
  await cluster.task(async ({ page, data }) => {
    // Each task reuses browser from pool
    await page.goto(data.url);
    return page.content();
  });
}

export async function scrapeWithPool(url: string) {
  return await cluster.execute({ url });
}
```

---

### 4.2 Caching Strategy

**Redis Setup:**
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCachedHotels(city: string) {
  const cached = await redis.get(`hotels:${city}`);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function cacheHotels(city: string, hotels: Hotel[]) {
  await redis.setex(
    `hotels:${city}`,
    600, // 10 minutes
    JSON.stringify(hotels)
  );
}
```

**Cache Invalidation:**
```typescript
// When new scrape completes, invalidate cache
await redis.del(`hotels:${city}`);
await redis.del(`stats:*`);
```

---

## Success Criteria & Testing Plan

### Phase 1 Success Criteria (Weeks 1-2)
- [ ] Dashboard shows correct statistics for all fields
- [ ] No null/undefined values in KPI display
- [ ] Scraper success rate >80%
- [ ] No crashes on tab switches
- [ ] Data persists across page reloads
- [ ] Test: Search 10 different cities, verify all appear in dashboard

### Phase 2 Success Criteria (Weeks 3-4)
- [ ] All data migrated to PostgreSQL
- [ ] Query times <50ms for 100K records
- [ ] Structured logs in proper JSON format
- [ ] >80% unit test coverage
- [ ] Monitoring alerts configured
- [ ] Test: 50 concurrent searches, all complete without errors

### Phase 3 Success Criteria (Weeks 5-8)
- [ ] WebSocket real-time updates working
- [ ] Price trends displaying correctly
- [ ] Historical data showing 30-day trends
- [ ] Recommendation engine working
- [ ] Test: Dashboard updates within 2 seconds of scrape completion

### Phase 4 Success Criteria (Weeks 9-12)
- [ ] Browser pool using max 3 concurrent browsers
- [ ] Cache hit rate >80%
- [ ] Handle 1000 concurrent users
- [ ] Response time <500ms (cached), <5s (live)
- [ ] Test: Load test with k6 showing 99th percentile <10s

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Database migration loses data | MEDIUM | CRITICAL | Backup before migration, test with sample data |
| Scraper stops working (selectors change) | HIGH | HIGH | Monitor success rate, set up alerts, maintain fallback selectors |
| Performance doesn't improve | MEDIUM | MEDIUM | Profile before/after, identify bottlenecks early |
| Browser crashes on production | MEDIUM | CRITICAL | Implement health checks, auto-restart mechanism |

---

## Estimated Timeline & Resource Allocation

**Total Effort:** 120 hours  
**Team:** 3 engineers (Backend, Frontend, DevOps)

| Phase | Week | Backend | Frontend | DevOps | Deliverable |
|---|---|---|---|---|---|
| 1 | 1-2 | 16h | 4h | 4h | Stable system, 80%+ success |
| 2 | 3-4 | 20h | 6h | 10h | Production-ready |
| 3 | 5-8 | 16h | 20h | 4h | Real-time, analytics |
| 4 | 9-12 | 12h | 8h | 8h | Scalable, optimized |

---

## GO/NO-GO Decision Gate

**Before Production Deployment, Verify:**

- [ ] Phase 1 complete with all success criteria met
- [ ] Database migration successful with zero data loss
- [ ] Monitoring alerts set up and tested
- [ ] Load test passed (1000 concurrent users)
- [ ] Security review completed (no OWASP Top 10)
- [ ] Incident response runbook created
- [ ] Backup and recovery tested
- [ ] Legal review completed (TOS compliance)

**Decision:** GO if 7/8 criteria met, otherwise address gaps and re-test.

