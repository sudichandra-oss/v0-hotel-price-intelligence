export function formatPrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Remove currency symbols, commas, and other non-numeric chars except dot
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

export function formatRating(ratingStr: string): number {
  if (!ratingStr) return 0;
  const cleaned = ratingStr.match(/[\d.]+/);
  return cleaned ? parseFloat(cleaned[0]) : 0;
}

export function formatReviewCount(countStr: string): number {
  if (!countStr) return 0;
  const cleaned = countStr.replace(/[^\d]/g, '');
  return parseInt(cleaned) || 0;
}

export function normalizeAmenity(amenity: string): string {
  return amenity.trim().toLowerCase().replace(/\s+/g, '_');
}

export function generateHotelId(name: string, city: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}`;
}

export function ratingToStarCategory(rating: number): number {
  // Convert numerical rating (0-10) to star category (2-5)
  if (!rating || rating < 6) return 2;  // 2-star for ratings below 6
  if (rating < 7.5) return 3;           // 3-star for 6.0-7.4
  if (rating < 8.5) return 4;           // 4-star for 7.5-8.4
  return 5;                              // 5-star for 8.5+
}
