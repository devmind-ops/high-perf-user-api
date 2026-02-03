
interface CacheEntry<T> {
    value: T;
    expiry: number;
    lastAccessed: number;
}

export class CacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private readonly maxSize: number;
    private readonly defaultTtl: number;
    private stats = {
        hits: 0,
        misses: 0,
    };

    private intervalId: NodeJS.Timeout;

    constructor(maxSize: number = 100, defaultTtlSeconds: number = 60) {
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtlSeconds * 1000;

        // Background task to clear stale entries
        this.intervalId = setInterval(() => {
            this.clearStaleEntries();
        }, 10000); // Check every 10 seconds
    }

    public cleanup() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Update last accessed for LRU policy
        entry.lastAccessed = Date.now();
        // Re-insert to update order in Map (JS Map maintains insertion order)
        this.cache.delete(key);
        this.cache.set(key, entry);

        this.stats.hits++;
        return entry.value;
    }

    public set(key: string, value: any, ttlSeconds?: number): void {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLru();
        }

        const ttl = (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl);
        const entry: CacheEntry<any> = {
            value,
            expiry: Date.now() + ttl,
            lastAccessed: Date.now(),
        };

        // Delete existing to re-insert at end (most recently used)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        this.cache.set(key, entry);
    }

    public clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
    }

    public getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }

    private evictLru(): void {
        // Map.keys() returns iterator in insertion order. 
        // The first item is the oldest inserted (or accessed if we delete/re-set on access).
        // so it is the LRU.
        const lruKey = this.cache.keys().next().value;
        if (lruKey !== undefined) {
            this.cache.delete(lruKey);
        }
    }

    private clearStaleEntries(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

export const cacheService = new CacheService();
