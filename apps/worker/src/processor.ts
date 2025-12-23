import { prisma } from '../../prisma/client.js';
import { redis } from './redis.js';
import { ROOM_CHANNEL_PREFIX } from './constants.js';
type QueueMessage = {
  msgId?: string;
  roomId: string;
  clientSenderId: string;
  content: string;
  metadata?: Record<string, unknown>;
  sentAt?: string;
};

// Processes a single message from Redis queue; uses msgId as idempotency key when present.
export async function processMessage(payload: QueueMessage) {
  const { msgId, roomId, clientSenderId, content } = payload;
  const idToUse = msgId ?? undefined;

  try {
    // ---- IDEMPOTENCY CHECK ----
    if (idToUse) {
      const exists = await prisma.message.findUnique({
        where: { id: idToUse }
      });
      if (exists) {
        console.log('Duplicate message ignored:', idToUse);
        return;
      }
    }

    // ---- WRITE MESSAGE TO DB ----
    const saved = await prisma.message.create({
      data: {
        ...(idToUse ? { id: idToUse } : {}),
        roomId,
        senderId: clientSenderId,
        body: content
      }
    });

    // ---- PUBLISH TO ROOM VIA PUB/SUB ----
    const pubChannel = `${ROOM_CHANNEL_PREFIX}${roomId}`;
    const pubPayload = {
      id: saved.id,
      roomId: saved.roomId,
      senderId: saved.senderId,
      content: saved.body,
      createdAt: saved.createdAt
    };
    console.log('[worker] 📤 Publishing to channel:', pubChannel);
    console.log('[worker] 📦 Payload:', JSON.stringify(pubPayload, null, 2));
    
    // Retry mechanism with exponential backoff
    let pubResult = 0;
    const maxRetries = 3;
    const initialDelay = 100;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      pubResult = await redis.publish(pubChannel, JSON.stringify(pubPayload));
      console.log('[worker] ✅ Publish attempt', attempt + 1, '- Returned:', pubResult, '(= number of subscribers)');
      
      if (pubResult > 0) {
        // Success - at least one subscriber received the message
        break;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = initialDelay * Math.pow(2, attempt);
        console.log('[worker] ⚠️  WARNING: No subscribers received this message! Retrying in', delay, 'ms...');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (pubResult === 0) {
      console.log('[worker] ❌ ERROR: Message published but no subscribers received it after', maxRetries + 1, 'attempts');
      console.log('[worker] This may indicate WebSocket server is not subscribed or room has no active members');
    } else {
      // Add a longer delay after successful publish to ensure pub/sub has time to deliver
      // This prevents race conditions when messages are sent quickly
      // Increased to 300ms to ensure reliable delivery
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[worker] ⏳ Waiting 300ms for pub/sub delivery to complete...');
    }
    
    console.log("Message processed:", saved.id);

  } catch (err) {
    console.error("[worker] ❌ Failed to process message:", err);
    console.error("[worker] ❌ Message payload was:", JSON.stringify(payload, null, 2));
    console.error("[worker] ❌ Error stack:", err instanceof Error ? err.stack : 'No stack trace');
    // Don't rethrow - we want to continue processing other messages
    // But log extensively so we can debug
  }
}
