import { redis, connectRedis } from "./redis.js";
import { processMessage } from "./processor.js";

console.log("Worker is starting...");

/**
 * Worker infinite loop
 * Listens to Redis list `queue:messages`
 */
async function startWorker() {
  console.log("Connecting to Redis...");
  await connectRedis();
  
  console.log("Worker is running... waiting for messages");
  
  while (true) {
    try {
      // BRPOP blocks until a new message arrives
      const res = await redis.brPop("queue:messages", 0);

      // Redis v4 returns { key, element }
      if (!res) {
        // No message received, continue loop
        continue;
      }
      const payloadStr = res.element;

      const payload = JSON.parse(payloadStr);

      await processMessage(payload);

    } catch (err) {
      console.error("Worker error:", err);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

startWorker().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
