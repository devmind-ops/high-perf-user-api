import request from 'supertest';
import { app } from '../src/server';
import { rateLimiter } from '../src/middleware/RateLimiter';
import { cacheService } from '../src/services/CacheService';

describe('User API Integration Tests', () => {

    beforeAll(async () => {
        // Setup
    });

    afterAll(() => {
        cacheService.cleanup();
    });

    beforeEach(async () => {
        // Reset state for isolation
        rateLimiter.reset();
        cacheService.clear();
    });

    describe('GET /users/:id', () => {
        it('should return 404 for non-existent user', async () => {
            const res = await request(app).get('/users/non-existent');
            expect(res.status).toBe(404);
        });

        it('should create and retrieve a user', async () => {
            // Create
            const user = { id: 'test1', name: 'Test User', email: 'test@example.com' };
            await request(app).post('/users').send(user).expect(201);

            // Retrieve
            const res = await request(app).get('/users/test1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(user);
        });

        it('should coalesce concurrent requests', async () => {
            const user = { id: 'coalesce_u', name: 'Coalesce User', email: 'c@example.com' };
            await request(app).post('/users').send(user).expect(201);
            await request(app).delete('/cache');

            // Fire 3 requests
            const start = Date.now();
            const promises = [
                request(app).get('/users/coalesce_u'),
                request(app).get('/users/coalesce_u'),
                request(app).get('/users/coalesce_u')
            ];

            const results = await Promise.all(promises);
            const duration = Date.now() - start;

            // Assertions
            results.forEach(res => {
                expect(res.status).toBe(200);
                expect(res.body).toEqual(user);
            });

            // Timings: Should be around 200ms (database delay)
            console.log(`Coalescing Duration: ${duration}ms`);
            expect(duration).toBeGreaterThanOrEqual(190);
            expect(duration).toBeLessThan(500);
        });
    });

    describe('Rate Limiter', () => {
        it('should limit burst requests', async () => {
            // Fire 6 requests (Limit is 5)
            const results = [];
            for (let i = 0; i < 6; i++) {
                results.push(request(app).get('/users/limit_test'));
            }

            const outcomes = await Promise.all(results);
            const statusCodes = outcomes.map(r => r.status);

            // Should contain at least one 429
            const successCount = statusCodes.filter(c => c === 200 || c === 404).length;
            const rateLimitedCount = statusCodes.filter(c => c === 429).length;

            expect(successCount).toBeLessThanOrEqual(5);
            expect(rateLimitedCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Cache Service', () => {
        it('should cache responses', async () => {
            const user = { id: 'cache_u', name: 'Cache User', email: 'cache@example.com' };
            await request(app).post('/users').send(user);
            await request(app).delete('/cache');

            // Miss
            const startMiss = Date.now();
            await request(app).get('/users/cache_u').expect(200);
            const durationMiss = Date.now() - startMiss;
            expect(durationMiss).toBeGreaterThanOrEqual(200);

            // Hit
            const startHit = Date.now();
            await request(app).get('/users/cache_u').expect(200);
            const durationHit = Date.now() - startHit;

            console.log(`Hit Duration: ${durationHit}ms`);
            expect(durationHit).toBeLessThan(100);
        });

        it('should provide stats', async () => {
            const res = await request(app).get('/cache-status');
            expect(res.status).toBe(200);
        });
    });
});
