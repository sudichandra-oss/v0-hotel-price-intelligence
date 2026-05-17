/**
 * Price Validation and Normalization
 * Ensures collected prices are accurate and properly formatted
 */

export interface ValidatedPrice {
  price: number;
  currency: string;
  originalPrice: string;
  isValid: boolean;
  reason?: string;
  source: string;
  timestamp: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₽': 'RUB',
};

const PLACEHOLDER_PRICES = [0, 1, 99, 999, 9999, 99999];
const MIN_VALID_PRICE = 100; // Minimum hotel price in INR
const MAX_REASONABLE_PRICE = 500000; // Maximum reasonable hotel price

/**
 * Validate if a price is legitimate (not a placeholder or error value)
 */
export function validatePrice(
  priceStr: string,
  source: string,
  timestamp: string = new Date().toISOString()
): ValidatedPrice {
  const originalPrice = priceStr;

  try {
    // Extract currency symbol
    let currency = 'INR'; // default
    for (const [symbol, curr] of Object.entries(CURRENCY_SYMBOLS)) {
      if (priceStr.includes(symbol)) {
        currency = curr;
        break;
      }
    }

    // Extract numeric value
    const numericMatch = priceStr.match(/[\d,]+(?:\.\d+)?/);
    if (!numericMatch) {
      return {
        price: 0,
        currency,
        originalPrice,
        isValid: false,
        reason: 'No numeric value found',
        source,
        timestamp,
      };
    }

    const price = parseInt(numericMatch[0].replace(/,/g, ''), 10);

    // Check for placeholder prices
    if (PLACEHOLDER_PRICES.includes(price)) {
      return {
        price,
        currency,
        originalPrice,
        isValid: false,
        reason: 'Placeholder price detected',
        source,
        timestamp,
      };
    }

    // Check reasonable range
    if (price < MIN_VALID_PRICE || price > MAX_REASONABLE_PRICE) {
      return {
        price,
        currency,
        originalPrice,
        isValid: false,
        reason: `Price out of reasonable range (${MIN_VALID_PRICE}-${MAX_REASONABLE_PRICE})`,
        source,
        timestamp,
      };
    }

    return {
      price,
      currency,
      originalPrice,
      isValid: true,
      source,
      timestamp,
    };
  } catch (error) {
    return {
      price: 0,
      currency: 'INR',
      originalPrice,
      isValid: false,
      reason: 'Error parsing price',
      source,
      timestamp,
    };
  }
}

/**
 * Standardize prices to a common currency
 * Using simple INR conversion rates as baseline
 */
export const CONVERSION_RATES: Record<string, number> = {
  'INR': 1,
  'USD': 83, // 1 USD ≈ 83 INR
  'EUR': 90, // 1 EUR ≈ 90 INR
  'GBP': 105, // 1 GBP ≈ 105 INR
  'JPY': 0.55, // 1 JPY ≈ 0.55 INR
};

/**
 * Convert price from one currency to another
 */
export function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: string = 'INR'
): number {
  if (fromCurrency === toCurrency) return price;

  const fromRate = CONVERSION_RATES[fromCurrency] || 1;
  const toRate = CONVERSION_RATES[toCurrency] || 1;

  return Math.round((price * fromRate) / toRate);
}

/**
 * Get the lowest valid price across multiple sources
 * Handles currency conversion automatically
 */
export function getLowestPrice(
  prices: Array<{ price: number; currency: string; source: string }>
): {
  lowestPrice: number;
  source: string;
  originalPrice: number;
  currency: string;
} | null {
  if (prices.length === 0) return null;

  // Convert all to INR for comparison
  const normalized = prices.map((p) => ({
    ...p,
    inrPrice: convertPrice(p.price, p.currency, 'INR'),
  }));

  // Sort by INR price
  const sorted = normalized.sort((a, b) => a.inrPrice - b.inrPrice);
  const lowest = sorted[0];

  return {
    lowestPrice: lowest.inrPrice,
    source: lowest.source,
    originalPrice: lowest.price,
    currency: lowest.currency,
  };
}

/**
 * Calculate price statistics
 */
export function calculatePriceStats(prices: number[]): {
  min: number;
  max: number;
  avg: number;
  median: number;
} {
  if (prices.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0 };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median =
    sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];

  return { min, max, avg, median };
}

/**
 * Detect price spikes (sudden price increases)
 */
export function detectPriceSpike(
  previousPrice: number,
  currentPrice: number,
  threshold: number = 0.2 // 20% increase
): boolean {
  if (previousPrice === 0) return false;
  const increase = (currentPrice - previousPrice) / previousPrice;
  return increase > threshold;
}
