import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not defined");
}

export const redis = createClient({
  url: process.env.REDIS_URL
});

export async function connectRedis() {
  await redis.connect();
  console.log("Connected to Redis");
}

