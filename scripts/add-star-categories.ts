import fs from 'fs';
import path from 'path';

// Function to convert rating to star category
function ratingToStarCategory(rating: number): number {
  if (!rating || rating < 6) return 2;  // 2-star for ratings below 6
  if (rating < 7.5) return 3;           // 3-star for 6.0-7.4
  if (rating < 8.5) return 4;           // 4-star for 7.5-8.4
  return 5;                              // 5-star for 8.5+
}

// Read the mock database file
const dbPath = path.join(__dirname, '../data/mock_db.json');
const dbContent = fs.readFileSync(dbPath, 'utf-8');
const db = JSON.parse(dbContent);

// Add star_category to all hotels that don't have it
if (db.hotels && Array.isArray(db.hotels)) {
  let updated = 0;
  db.hotels.forEach((hotel: any) => {
    if (!hotel.star_category && hotel.rating) {
      hotel.star_category = ratingToStarCategory(hotel.rating);
      updated++;
    } else if (!hotel.star_category) {
      // Default to 3 stars if no rating
      hotel.star_category = 3;
      updated++;
    }
  });
  
  console.log(`[✓] Updated ${updated} hotels with star categories`);
}

// Write the updated database back
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('[✓] Migration complete - star categories added to mock database');
