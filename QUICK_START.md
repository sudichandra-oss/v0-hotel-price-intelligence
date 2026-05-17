# Quick Start Guide - Hotel Price Intelligence

## 🚀 Get Running in 5 Minutes

### 1. Install & Setup
```bash
# Clone/navigate to project
cd /vercel/share/v0-project

# Install dependencies
pnpm install
# or: npm install / yarn install / bun install
```

### 2. Configure Environment (Optional)
```bash
# Copy example config
cp .env.example .env.local

# Edit .env.local and add SERPER_API_KEY (optional)
# Get free key from https://serper.dev
```

### 3. Run Dev Server
```bash
pnpm dev
# Server starts at http://localhost:3000
```

### 4. Test the System
1. Open http://localhost:3000
2. Type a city (e.g., "Mumbai", "London", "Delhi")
3. Select check-in and check-out dates
4. Wait 5-30 seconds for live results
5. See hotel prices from multiple sources

## 📊 What You Get

**Real-Time Data From:**
- Booking.com
- Agoda
- MakeMyTrip
- Expedia
- Google Hotels (fallback)

**Smart Features:**
- Lowest price highlighted
- Source breakdown table
- Price comparison across providers
- Data freshness timestamp
- Loading states
- Error handling

## 🔧 Configuration

### Optional: Google Hotels API
For fallback pricing when primary scrapers fail:
1. Go to https://serper.dev
2. Sign up (free: 100 searches/month)
3. Copy API key
4. Add to `.env.local`:
   ```
   SERPER_API_KEY=your_key_here
   ```

### Optional: Enable Debug Logging
```bash
# In .env.local
DEBUG_LOGGING=true
```

### Optional: Cache Results
```bash
# In .env.local
REDIS_URL=redis://...
CACHE_TTL_SECONDS=300
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/app/api/scrape/live/route.ts` | Main real-time scraping endpoint |
| `/components/hotel-search.tsx` | User search interface |
| `/lib/price-validator.ts` | Price validation & conversion |
| `/lib/hotel-matcher.ts` | Deduplication & fuzzy matching |
| `/lib/cache.ts` | Optional Redis caching |
| `/scripts/scrapers/*` | Individual provider scrapers |

## 🧪 Testing Checklist

- [ ] Search for a city
- [ ] See loading spinner
- [ ] Get results with multiple sources
- [ ] Lowest price is highlighted
- [ ] Check in/out dates work
- [ ] Star filter works
- [ ] Data timestamp shows
- [ ] Error handling works (try invalid city)

## 🛠️ Troubleshooting

### No results?
- Check browser console for errors
- Try a major city (Mumbai, London)
- Check server logs: `pnpm dev` output
- Wait 10-30 seconds (scrapers are slow)

### Timeout errors?
- Network may be slow
- Try again in a few seconds
- Check if websites are accessible

### Google API not working?
- `SERPER_API_KEY` not set
- API quota exceeded
- Try without (primary scrapers still work)

## 📚 Documentation

- **Full Guide**: See `LIVE_DATA_SCRAPER_GUIDE.md`
- **API Docs**: See `/app/api/scrape/live/route.ts`
- **Architecture**: See LIVE_DATA_SCRAPER_GUIDE.md > Architecture

## 🚢 Deployment to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Add live hotel scraping"
git push origin main

# Deploy from Vercel dashboard
# 1. Go to https://vercel.com/dashboard
# 2. Import this project
# 3. Add environment variables:
#    - SERPER_API_KEY (optional)
#    - REDIS_URL (optional)
# 4. Deploy

# Or use Vercel CLI:
vercel deploy
```

## 💡 Pro Tips

1. **Faster Results**: Use caching for popular cities
2. **Better Accuracy**: Always set check-in/out dates
3. **Test Locally First**: Use `pnpm dev` before deploying
4. **Monitor Logs**: Check `pnpm dev` output for errors
5. **Rate Limiting**: Some websites block rapid requests

## 📈 Performance

Typical response times:
- **With cache**: < 100ms
- **Without cache**: 10-30 seconds
- **Timeout**: 35 seconds per scraper

Result quality:
- 0-4 sources per search
- 20-50 hotels per search
- 1-2 sources per hotel (dedup)

## 🔐 Security

- No credentials stored in code
- API keys in environment variables
- Puppeteer runs in sandboxed mode
- No user data collected

## 📞 Support

**Common Issues:**
1. Scrapers timing out → Increase timeout in `.env.local`
2. No data → Check city name spelling
3. Errors → Enable `DEBUG_LOGGING=true`

**More Help:**
- See `LIVE_DATA_SCRAPER_GUIDE.md` for full documentation
- Check server logs in `pnpm dev` output
- Browser console for client-side errors

## 🎯 Next Steps

1. ✅ Implement real-time scraping
2. ✅ Add Google Hotels fallback
3. ✅ Implement price validation
4. ✅ Add hotel deduplication
5. ✅ Setup caching (optional)
6. Consider: WebSockets for live updates
7. Consider: User accounts & saved searches
8. Consider: Price alert notifications

---

**Ready to start?** Run `pnpm dev` and open http://localhost:3000
