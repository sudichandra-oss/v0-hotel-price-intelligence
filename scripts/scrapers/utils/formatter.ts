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
