import { redis, connectRedis } from "./redis.js";
import { processMessage } from "./processor.js";
import { QUEUE_MESSAGES } from "./constants.js";

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
      console.log('[worker] Waiting for message from queue...');
      const res = await redis.brPop(QUEUE_MESSAGES, 0);

      // Redis v4 returns { key, element }
      if (!res) {
        // No message received, continue loop
        console.log('[worker] ⚠️ No message received from BRPOP');
        continue;
      }
      
      const payloadStr = res.element;
      console.log('[worker] ✅ Got message from queue:', res.key);
      console.log('[worker] 📦 Raw payload:', payloadStr);

      let payload;
      try {
        payload = JSON.parse(payloadStr);
        console.log('[worker] 📋 Parsed payload:', { msgId: payload.msgId, roomId: payload.roomId, content: payload.content, senderId: payload.clientSenderId });
      } catch (parseErr) {
        console.error('[worker] ❌ Failed to parse JSON:', parseErr);
        console.error('[worker] ❌ Raw payload was:', payloadStr);
        continue; // Skip this message and continue
      }

      if (!payload.roomId || !payload.content) {
        console.error('[worker] ❌ Invalid payload - missing roomId or content:', payload);
        continue; // Skip this message and continue
      }

      console.log('[worker] 🔄 Processing message:', payload.msgId || 'no-msgId');
      await processMessage(payload);
      console.log('[worker] ✅ Successfully processed message:', payload.msgId || 'no-msgId');
      
      // Add a longer delay between processing messages to prevent race conditions
      // This ensures pub/sub has time to deliver messages before processing the next one
      // Increased to 300ms to ensure reliable delivery
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[worker] ⏳ Waiting 300ms before processing next message...');

    } catch (err) {
      console.error("[worker] ❌ Worker error:", err);
      console.error("[worker] ❌ Error stack:", err instanceof Error ? err.stack : 'No stack trace');
      // Wait before retrying to avoid tight error loop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

startWorker().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
