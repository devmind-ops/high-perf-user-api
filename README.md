# High Performance User API

A high-performance Express.js API demonstrating advanced patterns for concurrency, caching, and rate limiting in TypeScript.

## Features

### 1. Request Coalescing (Concurrency Handling)
To prevent "thundering herd" problems where multiple concurrent requests for the same resource overwhelm the database, we implement **Request Coalescing**.
- **Logic**: When a request comes in for a User ID, we check if there is arguably an ongoing fetch operation for that ID.
- **Implementation**: We use a `Map<string, Promise<User>>` to store inflight requests. Subsequent requests for the same ID await the *same* promise instead of triggering a new database call.
- **Benefit**: 100 simultaneous requests for `User:1` result in **1 database call**.

### 2. Burst Rate Limiting (Token Bucket)
We implement a custom **Token Bucket** algorithm for rate limiting.
- **Rules**:
    - **Capacity**: 5 tokens (max burst of 5 requests).
    - **Refill Rate**: 10 requests/minute (approx 1 token every 6 seconds).
- **Behavior**:
    - A user can burst up to 5 requests instantly.
    - After depleting tokens, they must wait for the bucket to refill.
    - Excess requests receive a `429 Too Many Requests` status.

### 3. LRU Cache
An in-memory Least Recently Used (LRU) cache stores user data.
- **Eviction**: Removes least recently accessed items when size limit is reached.
- **TTL**: Entries expire after 60 seconds.
- **Stale Cleanup**: A background task runs every 10 seconds to proactively remove expired entries.

### 4. Async Order Processing
A simulated asynchronous queue ensures database operations are processed in a controlled manner, mimicking a 200ms DB latency.

## API Endpoints

- `GET /users/:id` - Fetch user (Cached + Coalesced)
- `POST /users` - Create user
- `DELETE /cache` - Clear cache
- `GET /cache-status` - View cache stats

## Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the server:
   ```bash
   npx ts-node src/server.ts
   ```
