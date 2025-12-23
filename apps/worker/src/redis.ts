import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config({ path: '../../.env' });

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not defined");
}

// Use localhost for local dev, or fall back to env value (for Docker)
const redisUrl = process.env.REDIS_URL.replace('redis://redis:', 'redis://localhost:');

export const redis = createClient({
  url: redisUrl
});

export async function connectRedis() {
  await redis.connect();
  console.log("Connected to Redis");
}

