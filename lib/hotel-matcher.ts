/**
 * Hotel Deduplication and Matching
 * Identifies the same hotel across different sources and prevents duplicates
 */

export interface HotelRecord {
  name: string;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  source: string;
  price: number;
  [key: string]: any;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score between 0 and 1 (1 = identical)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const levenshteinDistance = matrix[len1][len2];
  return 1 - levenshteinDistance / maxLen;
}

/**
 * Calculate geographic distance between two coordinates
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if two hotels are likely the same based on name and location similarity
 */
export function areHotelsSame(
  hotel1: HotelRecord,
  hotel2: HotelRecord,
  nameSimilarityThreshold: number = 0.7,
  distanceThreshold: number = 2 // km
): boolean {
  // Must be in same city
  if (hotel1.city.toLowerCase() !== hotel2.city.toLowerCase()) {
    return false;
  }

  // Check name similarity (normalized)
  const name1Normalized = hotel1.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
  const name2Normalized = hotel2.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

  const nameSimilarity = stringSimilarity(name1Normalized, name2Normalized);

  if (nameSimilarity < nameSimilarityThreshold) {
    return false;
  }

  // If we have coordinates, check location proximity
  if (
    hotel1.latitude !== undefined &&
    hotel1.longitude !== undefined &&
    hotel2.latitude !== undefined &&
    hotel2.longitude !== undefined
  ) {
    const distance = calculateDistance(
      hotel1.latitude,
      hotel1.longitude,
      hotel2.latitude,
      hotel2.longitude
    );

    return distance <= distanceThreshold;
  }

  // If no coordinates, rely on name similarity
  return nameSimilarity > nameSimilarityThreshold;
}

/**
 * Deduplicate hotels from multiple sources
 * Returns grouped hotels with primary match and all alternatives
 */
export interface HotelGroup {
  primary: HotelRecord;
  alternatives: HotelRecord[];
  sourceBreakdown: Array<{
    source: string;
    price: number;
    currency: string;
  }>;
  lowestPrice: number;
  lowestPriceSource: string;
}

export function deduplicateHotels(hotels: HotelRecord[]): HotelGroup[] {
  const groups: HotelGroup[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < hotels.length; i++) {
    if (processed.has(i)) continue;

    const primary = hotels[i];
    const alternatives: HotelRecord[] = [];
    const sourceBreakdown: Array<{
      source: string;
      price: number;
      currency: string;
    }> = [
      {
        source: primary.source,
        price: primary.price,
        currency: primary.currency || 'INR',
      },
    ];

    // Find all matching hotels
    for (let j = i + 1; j < hotels.length; j++) {
      if (processed.has(j)) continue;

      if (areHotelsSame(primary, hotels[j])) {
        alternatives.push(hotels[j]);
        processed.add(j);
        sourceBreakdown.push({
          source: hotels[j].source,
          price: hotels[j].price,
          currency: hotels[j].currency || 'INR',
        });
      }
    }

    // Calculate lowest price
    const prices = sourceBreakdown.map((s) => s.price);
    const lowestPrice = Math.min(...prices);
    const lowestPriceSource =
      sourceBreakdown.find((s) => s.price === lowestPrice)?.source || primary.source;

    groups.push({
      primary,
      alternatives,
      sourceBreakdown: sourceBreakdown.sort((a, b) => a.price - b.price),
      lowestPrice,
      lowestPriceSource,
    });

    processed.add(i);
  }

  return groups;
}

/**
 * Merge duplicate hotel records, keeping the one with best data quality
 */
export function mergeHotels(hotels: HotelRecord[]): HotelRecord {
  if (hotels.length === 0) {
    throw new Error('Cannot merge empty array');
  }

  if (hotels.length === 1) {
    return hotels[0];
  }

  // Score hotels by data completeness
  const scored = hotels.map((h) => ({
    hotel: h,
    score: (
      (h.name ? 1 : 0) +
      (h.address ? 1 : 0) +
      (h.rating !== undefined ? 1 : 0) +
      (h.latitude !== undefined ? 1 : 0) +
      (h.review_count ? 1 : 0) +
      (h.photo_url ? 1 : 0)
    ),
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Merge with best as primary
  const merged = { ...scored[0].hotel };

  // Fill in missing fields from other sources
  for (const { hotel } of scored.slice(1)) {
    for (const key of Object.keys(hotel)) {
      if (!merged[key] && hotel[key] !== undefined && hotel[key] !== null) {
        merged[key] = hotel[key];
      }
    }
  }

  return merged;
}

/**
 * Clean and normalize hotel names for better matching
 */
export function normalizeHotelName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s*(hotel|resort|inn|lodge|motel|villa|retreat|spa)\s*$/i, '')
    // Remove special characters except spaces
    .replace(/[^\w\s&-]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a unique hotel identifier based on name and city
 */
export function generateHotelKey(name: string, city: string): string {
  const normalized = normalizeHotelName(name);
  const cityNormalized = city.toLowerCase().trim();
  return `${normalized}|${cityNormalized}`;
}
