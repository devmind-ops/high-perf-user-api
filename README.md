User Data API - High Performance Service
This is an expert-level Express.js API developed in TypeScript, designed to handle high-traffic user data requests with advanced caching, request coalescing, and sophisticated rate limiting.


🚀 Getting Started
Install dependencies:

Bash

pnpm install
Run the server:

Bash

pnpm dev
The API will be available at http://localhost:3000.



🧠 System Architecture & Strategies
Advanced LRU Caching
To optimize performance, I implemented an In-Memory Least Recently Used (LRU) Cache .


TTL (Time to Live): Data is stored for exactly 60 seconds before invalidation.


Background Cleanup: A background task automatically clears stale entries to prevent memory leaks.


Stats: The GET /cache-status endpoint provides real-time metrics on hits, misses, and current size.


Request Coalescing (Concurrency Control)
To prevent "cache stampedes" or redundant database hits, I implemented Request Coalescing.

If multiple concurrent requests arrive for the same userId, only the first request triggers the 200ms simulated database call.


Subsequent requests for that same ID "subscribe" to the first request's promise, returning the result once it completes.

Sophisticated Rate Limiting
The API uses a custom rate-limiting middleware designed to handle burst traffic.


General Limit: 10 requests per minute.


Burst Capacity: Allows for a burst of 5 requests within a tight 10-second window.


Status: Returns a 429 Too Many Requests status code with a descriptive message when limits are breached.




🛠️ API Endpoints

GET /users/:id: Retrieve user data (cached/coalesced).


POST /users: Simulate user creation and update the cache .


GET /cache-status: View real-time cache performance and average response times.


DELETE /cache: Manually purge the entire cache.



✅ Testing
You can measure the caching effect by comparing response times between the first request (~200ms) and subsequent requests (<10ms). High traffic can be simulated to test the burst rate limiter.