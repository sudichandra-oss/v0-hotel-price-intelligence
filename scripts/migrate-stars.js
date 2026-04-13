#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to convert rating to star category
function ratingToStarCategory(rating) {
  if (!rating || rating < 6) return 2;  // 2-star for ratings below 6
  if (rating < 7.5) return 3;           // 3-star for 6.0-7.4
  if (rating < 8.5) return 4;           // 4-star for 7.5-8.4
  return 5;                              // 5-star for 8.5+
}

// Try to find the database file
const possiblePaths = [
  '/vercel/share/v0-project/data/mock_db.json',
  path.join(process.cwd(), 'data/mock_db.json'),
  'data/mock_db.json'
];

let dbPath = null;
for (const p of possiblePaths) {
  try {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  } catch (e) {
    // Continue searching
  }
}

if (!dbPath) {
  console.error('[✗] Could not find mock_db.json in any expected location');
  process.exit(1);
}

try {
  console.log(`[v0] Reading database from: ${dbPath}`);
  const dbContent = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(dbContent);

  // Add star_category to all hotels that don't have it
  if (db.hotels && Array.isArray(db.hotels)) {
    let updated = 0;
    let skipped = 0;
    
    db.hotels.forEach((hotel) => {
      if (!hotel.star_category && hotel.rating) {
        hotel.star_category = ratingToStarCategory(hotel.rating);
        updated++;
      } else if (!hotel.star_category) {
        // Default to 3 stars if no rating
        hotel.star_category = 3;
        updated++;
      } else {
        skipped++;
      }
    });
    
    console.log(`[v0] Updated ${updated} hotels with star categories`);
    console.log(`[v0] Skipped ${skipped} hotels that already had star_category`);
    console.log(`[v0] Total hotels: ${db.hotels.length}`);

    // Write the updated database back
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`[✓] Migration complete - star categories saved to ${dbPath}`);
  } else {
    console.error('[✗] No hotels array found in database');
    process.exit(1);
  }
} catch (error) {
  console.error('[✗] Migration failed:', error.message);
  process.exit(1);
}
