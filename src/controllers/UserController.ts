import { Request, Response } from 'express';
import { cacheService } from '../services/CacheService';
import { coalescingService } from '../services/CoalescingService';
import { queueService } from '../services/QueueService';

interface User {
    id: string;
    name: string;
    email: string;
}

// Mock Database
const db: Map<string, User> = new Map();

// Helper to simulate DB Fetch
const fetchUserFromDb = async (id: string): Promise<User | null> => {
    return queueService.enqueue(async () => {
        // delay is already handled by queueService
        return db.get(id) || null;
    });
};

export class UserController {

    static async getUser(req: Request, res: Response) {
        const id = req.params.id as string;

        try {
            // 1. Check Cache
            const cached = cacheService.get<User>(id);
            if (cached) {
                return res.json(cached);
            }

            // 2. Coalesced Fetch
            const result = await coalescingService.coalesce(id, async () => {
                // Double check cache inside coalesce? 
                // Not strictly necessary if we rely on the promise being shared, 
                // but often good practice if the coalescing lock is granular.
                // Here, we proceed to fetch.

                const data = await fetchUserFromDb(id);

                if (data) {
                    cacheService.set(id, data);
                }
                return data;
            });

            if (!result) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async createUser(req: Request, res: Response) {
        const { id, name, email } = req.body;

        if (!id || !name || !email) {
            return res.status(400).json({ error: 'Missing req fields' });
        }

        try {
            await queueService.enqueue(async () => {
                db.set(id, { id, name, email });
                // Update cache immediately? Or let it expire?
                // Prompt says "Updates the cache".
                cacheService.set(id, { id, name, email });
            });

            return res.status(201).json({ message: 'User created' });
        } catch (error) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static clearCache(req: Request, res: Response) {
        cacheService.clear();
        return res.status(200).json({ message: 'Cache cleared' });
    }

    static getCacheStatus(req: Request, res: Response) {
        return res.json(cacheService.getStats());
    }
}
