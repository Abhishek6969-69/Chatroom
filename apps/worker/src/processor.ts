import { prisma } from '../../prisma/client.js';
import { redis } from './redis.js';
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
    await redis.publish(`room:${roomId}`, JSON.stringify({
      id: saved.id,
      roomId: saved.roomId,
      senderId: saved.senderId,
      content: saved.body,
      createdAt: saved.createdAt
    }));

    console.log("Message processed:", saved.id);

  } catch (err) {
    console.error("Failed to process message:", err);
  }
}
