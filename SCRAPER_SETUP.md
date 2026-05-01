# Scraper Job Queue Setup

## Overview

The scraper system is designed with a **separate worker process** architecture to handle real Puppeteer-based web scraping. The Next.js API routes **queue jobs** while a standalone Node.js worker process **executes the scraping**.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser UI (React)                                     │
│  - Triggers scrape via /api/scrape endpoint            │
│  - Polls /api/scrape/status for job progress           │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API Routes (/api/scrape)                       │
│  - Validates input                                      │
│  - Enqueues job to scrape-queue.json                    │
│  - Returns job ID (202 status)                          │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│  Job Queue File (data/scrape-queue.json)                │
│  - Stores pending, running, completed jobs              │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│  Scraper Worker (scripts/scraper-worker.ts)             │
│  - Polls queue every 5 seconds                          │
│  - Launches Puppeteer for real web scraping            │
│  - Updates job status in queue                          │
│  - Saves scraped data to database                       │
└─────────────────────────────────────────────────────────┘
```

## Running the System

### Development (with worker)

Run both the Next.js dev server AND the scraper worker in parallel:

```bash
npm run dev:full
```

This runs:
- `npm run dev` - Next.js dev server on port 3000
- `npm run worker` - Scraper worker in the background

### Development (without worker)

If you only want the Next.js dev server:

```bash
npm run dev
```

The API will queue jobs, but they won't be processed until the worker is running.

### Run only the worker

If you want to start a scraper worker separately:

```bash
npm run worker
```

The worker will poll for jobs and process them continuously.

## How It Works

### 1. User Initiates Scrape

User clicks "Start Scrape" in the UI, which calls:

```javascript
POST /api/scrape
{
  "city": "Mumbai",
  "startDate": "2024-05-15",
  "endDate": "2024-05-16",
  "providers": ["Booking.com", "MakeMyTrip"]
}
```

### 2. API Queues Job

The `/api/scrape` endpoint:
- Validates inputs
- Creates a job object with status `pending`
- Saves it to `data/scrape-queue.json`
- Returns `202 Accepted` with job ID

```javascript
{
  "message": "Scrape job queued successfully",
  "jobId": "job-uuid",
  "city": "Mumbai",
  "providers": ["Booking.com", "MakeMyTrip"],
  "startDate": "2024-05-15",
  "endDate": "2024-05-16"
}
```

### 3. Worker Processes Job

The scraper worker:
- Polls `data/scrape-queue.json` every 5 seconds
- Finds pending jobs
- Marks job as `running`
- Launches Puppeteer instances for each provider
- Scrapes real hotel data from Booking.com, MakeMyTrip, Agoda, Expedia
- Saves data to database
- Updates job status to `completed` or `failed`

### 4. UI Polls Job Status

The UI periodically calls:

```javascript
GET /api/scrape/status
```

Response:

```javascript
{
  "progress": 50,
  "total": 2,
  "completed": 1,
  "running": 1,
  "latest": {
    "id": "job-uuid",
    "city": "Mumbai",
    "website": "booking",
    "status": "running",
    "records_inserted": 15,
    "started_at": "2024-05-15T10:30:00Z",
    "completed_at": null,
    "error_message": null
  },
  "logs": [...]
}
```

## Job Queue File

The queue is stored in `data/scrape-queue.json`:

```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "city": "Mumbai",
      "country": "India",
      "startDate": "2024-05-15",
      "endDate": "2024-05-16",
      "providers": ["Booking.com", "MakeMyTrip"],
      "status": "completed",
      "createdAt": "2024-05-15T10:00:00Z",
      "startedAt": "2024-05-15T10:05:00Z",
      "completedAt": "2024-05-15T10:25:00Z",
      "hotelsScraped": 47
    }
  ]
}
```

## Troubleshooting

### Jobs Not Processing

**Issue**: Jobs stay in `pending` status

**Solution**:
- Make sure the worker is running: `npm run worker`
- Check worker logs for errors
- Verify `data/scrape-queue.json` exists and is readable

### Puppeteer Errors

**Issue**: Worker crashes with Puppeteer not found

**Solution**:
```bash
npm install puppeteer cheerio
```

### Port Already in Use

**Issue**: Port 3000 is already in use

**Solution**:
```bash
lsof -i :3000  # Find process using port
kill -9 <PID>  # Kill the process
```

## Real Web Scraping

The scrapers use real Puppeteer to scrape live data from:

- **Booking.com** - HTML parsing of search results
- **MakeMyTrip** - Indian market hotel search
- **Agoda** - Asia-focused hotel aggregator
- **Expedia** - Worldwide travel search

Each scraper:
1. Constructs the correct search URL
2. Launches a Puppeteer browser
3. Navigates to the website with appropriate check-in/check-out dates
4. Waits for content to load
5. Parses HTML with Cheerio
6. Extracts hotel name, price, rating, reviews, location
7. Saves to database with meal plan and currency info
8. Closes browser

## Database Schema

Hotels are saved with:
- `hotel_id` - Unique identifier
- `name` - Hotel name
- `address` - Full address
- `city` - City name
- `country` - Country name
- `rating` - Star rating (1-5)
- `review_count` - Number of reviews
- `latitude`, `longitude` - Map coordinates
- `source` - Website source (booking, makemytrip, agoda, expedia)

Price history records include:
- `hotel_id` - Reference to hotel
- `price` - Nightly rate
- `currency` - INR, USD, etc.
- `stay_date` - Date of stay
- `check_in_date`, `check_out_date` - Booking dates
- `source` - Which website provided the price
