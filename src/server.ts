import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { UserController } from './controllers/UserController';
import { rateLimiter } from './middleware/RateLimiter';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Apply global rate limiter
app.use(rateLimiter.middleware);

app.get('/users/:id', UserController.getUser);
app.post('/users', UserController.createUser);
app.delete('/cache', UserController.clearCache);
app.get('/cache-status', UserController.getCacheStatus);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export { app };
