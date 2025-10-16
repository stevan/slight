/**
 * Async queue that supports blocking dequeue operations.
 * When dequeuing from an empty queue, the operation blocks until an item is enqueued.
 */
export class AsyncQueue<T> {
    private queue: T[] = [];
    private resolvers: ((value: T) => void)[] = [];

    /**
     * Add an item to the queue.
     * If there are waiting dequeuers, immediately resolve the oldest one.
     */
    enqueue(item: T): void {
        if (this.resolvers.length > 0) {
            // Someone is waiting, resolve them immediately
            const resolve = this.resolvers.shift()!;
            resolve(item);
        } else {
            // No one waiting, add to queue
            this.queue.push(item);
        }
    }

    /**
     * Remove and return an item from the queue.
     * If the queue is empty, blocks until an item is enqueued.
     */
    async dequeue(): Promise<T> {
        if (this.queue.length > 0) {
            // Items available, return immediately
            return this.queue.shift()!;
        } else {
            // Queue empty, wait for enqueue
            return new Promise<T>((resolve) => {
                this.resolvers.push(resolve);
            });
        }
    }

    /**
     * Check if the queue is empty
     */
    isEmpty(): boolean {
        return this.queue.length === 0;
    }

    /**
     * Get the number of items in the queue
     */
    size(): number {
        return this.queue.length;
    }
}
