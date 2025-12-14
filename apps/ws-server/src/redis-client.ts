import {createClient} from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
}
export const redis = createClient({
    url: redisUrl
});
export const subscriber = redis.duplicate();
redis.on('error',(err)=>console.log('Redis Client Error',err));
await redis.connect();
await subscriber.connect();