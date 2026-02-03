
type Task<T> = () => Promise<T>;

export class QueueService {
    private queue: Array<{ task: Task<any>, resolve: (val: any) => void, reject: (err: any) => void }> = [];
    private isProcessing: boolean = false;
    private readonly delayMs: number;

    constructor(delayMs: number = 200) {
        this.delayMs = delayMs;
    }

    public enqueue<T>(task: Task<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (!item) break;

            try {
                // Simulate DB delay
                await new Promise(resolve => setTimeout(resolve, this.delayMs));

                const result = await item.task();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        }

        this.isProcessing = false;
    }
}

export const queueService = new QueueService();
