import {createClient} from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
}

// Replace Docker hostname with localhost for local development
const localRedisUrl = redisUrl.replace('redis://redis:', 'redis://localhost:');

const redisClient = createClient({
    url: localRedisUrl
});
const subscriberClient = redisClient.duplicate();

redisClient.on('error',(err)=>console.log('Redis Client Error',err));
subscriberClient.on('error',(err)=>console.log('Redis Subscriber Error',err));

// Connect to Redis
await redisClient.connect();
console.log('Redis client connected');
console.log('Redis client type:', typeof redisClient);
console.log('Redis client has lPush:', typeof redisClient.lPush);
console.log('Redis client has lpush:', typeof redisClient.lpush);
console.log('Available Redis methods:', Object.keys(redisClient).slice(0, 10));
await subscriberClient.connect();
console.log('Redis subscriber connected');

export const redis = redisClient;
export const subscriber = subscriberClient;