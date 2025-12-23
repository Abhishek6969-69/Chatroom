import { v4 as uuidv4 } from "uuid";
import {redis} from './redis-client.js';
import { QUEUE_MESSAGES } from './constants.js';
export const handleWsMessage = async ({ ws, userId, roomMembers, userRooms }:{ ws: any, userId: string, roomMembers: Map<string, Set<string>>, userRooms: Map<string, Set<string>> }, msg:any) => {
 if(msg.type === 'join-room') {
    const { roomId } = msg;
     if (!roomId) return ws.send(JSON.stringify({
      type: "error",
      message: "roomId missing"
    }));
    if(!roomMembers.has(roomId)) {
        roomMembers.set(roomId,new Set());
        console.log('[join-room] 🆕 Created new room:', roomId);
    }
    roomMembers.get(roomId)?.add(userId);
    
    // Also maintain userRooms map for faster lookup
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }
    userRooms.get(userId)?.add(roomId);
    
    console.log('[join-room] ✅', userId, 'joined room', roomId, '| Total members:', roomMembers.get(roomId)?.size, '| Members:', Array.from(roomMembers.get(roomId) || []));
    return ws.send(JSON.stringify({
      type: "join-room-success",
      roomId
    }));
 }
 if(msg.type === 'leave-room') {
    const { roomId } = msg;
    if (!roomId) return ws.send(JSON.stringify({
      type: "error",
      message: "roomId missing"
    }));
    roomMembers.get(roomId)?.delete(userId);
    userRooms.get(userId)?.delete(roomId);
    return ws.send(JSON.stringify({
      type: "leave-room-success",
      roomId
    }));
 }
 if(msg.type === 'send-message') {
    const { roomId, content } = msg;
    if (!roomId || !content) return ws.send(JSON.stringify({
      type: "error",
      message: "roomId or content missing"
    }));
   const payload = {
      msgId: msg.msgId || uuidv4(),
      roomId,
      clientSenderId: userId,
      content,
      metadata: msg.metadata || {},
      sentAt: new Date().toISOString()
    };
    console.log('[send-message] 📤 Attempting to push message to queue');
    console.log('[send-message] 📦 Payload:', JSON.stringify(payload, null, 2));
    
     if (redis && typeof redis.lPush === 'function') {
       try {
         const result = await redis.lPush(QUEUE_MESSAGES, JSON.stringify(payload));
         console.log('[send-message] ✅ Message pushed to queue:', payload.msgId, '| Queue length:', result);
       } catch (err) {
         console.error('[send-message] ❌ Failed to push to queue:', err);
         return ws.send(JSON.stringify({
           type: "error",
           message: "Failed to queue message"
         }));
       }
     } else {
       console.error('[send-message] ❌ Redis client not available or lPush not a function');
       return ws.send(JSON.stringify({
         type: "error",
         message: "Redis client is not available"
       }));
     }
    
    // Send success response to sender
    ws.send(JSON.stringify({
      type: "send-message-success",
      clientMsgId: msg.msgId,
      serverMsgId: payload.msgId,
      sentAt: payload.sentAt
    }));
    
    // Also send the message directly back to the sender immediately
    // This ensures the sender sees their message right away, not waiting for pub/sub
    ws.send(JSON.stringify({
      type: "message",
      id: payload.msgId,
      roomId: roomId,
      senderId: userId,
      content: content,
      createdAt: payload.sentAt
    }));
 }
}