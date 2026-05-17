/**
 * Caching Utility
 * Optional Redis caching layer for search results
 * Falls back to in-memory caching if Redis is unavailable
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in seconds
}

// In-memory cache (fallback)
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Generate cache key from search parameters
 */
export function generateCacheKey(
  city: string,
  checkIn: string,
  checkOut: string
): string {
  return `hotels:${city.toLowerCase()}:${checkIn}:${checkOut}`;
}

/**
 * Get from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    // Try Redis first if available
    if (process.env.REDIS_URL) {
      const value = await getCacheFromRedis<T>(key);
      if (value) return value;
    }

    // Fallback to memory cache
    const entry = memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    const ageSeconds = (Date.now() - entry.timestamp) / 1000;
    if (ageSeconds > entry.ttl) {
      memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  } catch (error) {
    console.warn('[v0] Cache read error:', error);
    return null;
  }
}

/**
 * Set in cache
 */
export async function setInCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    // Try Redis first if available
    if (process.env.REDIS_URL) {
      await setCacheInRedis(key, data, ttlSeconds);
    } else {
      // Fallback to memory cache
      memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      });
    }
  } catch (error) {
    console.warn('[v0] Cache write error:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Delete from cache
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    if (process.env.REDIS_URL) {
      await deleteFromRedis(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.warn('[v0] Cache delete error:', error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    if (process.env.REDIS_URL) {
      await clearRedisCache();
    } else {
      memoryCache.clear();
    }
  } catch (error) {
    console.warn('[v0] Cache clear error:', error);
  }
}

/**
 * Get memory cache stats
 */
export function getCacheStats() {
  // Count non-expired entries
  let validEntries = 0;
  memoryCache.forEach((entry) => {
    const ageSeconds = (Date.now() - entry.timestamp) / 1000;
    if (ageSeconds <= entry.ttl) {
      validEntries++;
    }
  });

  return {
    type: process.env.REDIS_URL ? 'redis' : 'memory',
    size: memoryCache.size,
    validEntries,
  };
}

/**
 * Redis Implementation (Placeholder)
 * In production, integrate with Upstash Redis or similar
 */

async function getCacheFromRedis<T>(key: string): Promise<T | null> {
  // Placeholder - implement with actual Redis client
  // Example with ioredis:
  // const redis = new Redis(process.env.REDIS_URL);
  // const value = await redis.get(key);
  // return value ? JSON.parse(value) : null;
  return null;
}

async function setCacheInRedis<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  // Placeholder - implement with actual Redis client
  // Example with ioredis:
  // const redis = new Redis(process.env.REDIS_URL);
  // await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

async function deleteFromRedis(key: string): Promise<void> {
  // Placeholder
}

async function clearRedisCache(): Promise<void> {
  // Placeholder
}

/**
 * Cache decorator for functions
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl: number = 300
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);

    // Try to get from cache
    const cached = await getFromCache<R>(key);
    if (cached) {
      console.log(`[v0] Cache hit for key: ${key}`);
      return cached;
    }

    // Execute function
    console.log(`[v0] Cache miss for key: ${key}, executing function`);
    const result = await fn(...args);

    // Store in cache
    await setInCache(key, result, ttl);

    return result;
  };
}
