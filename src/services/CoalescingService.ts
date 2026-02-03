
type Fetcher<T> = () => Promise<T>;

export class CoalescingService {
    private inflightRequests: Map<string, Promise<any>> = new Map();

    public async coalesce<T>(key: string, fetcher: Fetcher<T>): Promise<T> {
        const existingPromise = this.inflightRequests.get(key);

        if (existingPromise) {
            return existingPromise;
        }

        const promise = fetcher()
            .then((result) => {
                return result;
            })
            .catch((error) => {
                throw error;
            })
            .finally(() => {
                // Remove from map when finished (success or error)
                this.inflightRequests.delete(key);
            });

        this.inflightRequests.set(key, promise);

        return promise;
    }
}

export const coalescingService = new CoalescingService();
