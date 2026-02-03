import { Request, Response, NextFunction } from 'express';

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

export class RateLimiter {
    private buckets: Map<string, TokenBucket> = new Map();
    private readonly capacity: number;
    private readonly refillRateMs: number;
    private readonly tokensPerRefill: number;

    constructor(maxBurst: number = 5, requestsPerMinute: number = 10) {
        this.capacity = maxBurst;
        // requestsPerMinute = 10 => 60s / 10 = 6s per token.
        this.refillRateMs = (60 * 1000) / requestsPerMinute;
        this.tokensPerRefill = 1;
    }

    public middleware = (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // Get bucket or create new
        let bucket = this.buckets.get(ip);
        const now = Date.now();

        if (!bucket) {
            bucket = {
                tokens: this.capacity,
                lastRefill: now
            };
            this.buckets.set(ip, bucket);
        } else {
            // Refill tokens based on time elapsed
            const timeElapsed = now - bucket.lastRefill;
            const tokensToAdd = Math.floor(timeElapsed / this.refillRateMs) * this.tokensPerRefill;

            if (tokensToAdd > 0) {
                bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
                bucket.lastRefill = now; // Reset reference time to now (simplified) or lastRefill + tokensToAdd * rate
                // Better precision:
                // bucket.lastRefill = bucket.lastRefill + (tokensToAdd / this.tokensPerRefill) * this.refillRateMs;
                // But for simple rate limiting, sticking to 'now' avoids drift issues in long idle times if we cap at capacity.
                // Actually, if we cap at capacity, we should just set lastRefill to now.
            }
        }

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            next();
        } else {
            res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded' });
        }
    }
    public reset(): void {
        this.buckets.clear();
    }
}

export const rateLimiter = new RateLimiter();
