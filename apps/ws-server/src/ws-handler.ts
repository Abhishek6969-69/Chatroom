import { v4 as uuidv4 } from "uuid";
import {redis} from './redis-client.js';
export const handleWsMessage = async ({ ws, userId, roomMembers }:{ ws: any, userId: string, roomMembers: Map<string, Set<string>> }, msg:any) => {
 if(msg.type === 'join-room') {
    const { roomId } = msg;
     if (!roomId) return ws.send(JSON.stringify({
      type: "error",
      message: "roomId missing"
    }));
    if(!roomMembers.has(roomId)) {
        roomMembers.set(roomId,new Set());
    }
    roomMembers.get(roomId)?.add(userId);
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
     if (redis && redis.lpush) {
       await redis.lpush('queue:messages', JSON.stringify(payload));
     } else {
       return ws.send(JSON.stringify({
         type: "error",
         message: "Redis client is not available"
       }));
     }
    return ws.send(JSON.stringify({
      type: "send-message-success",
      clientMsgId: msg.msgId,
      serverMsgId: payload.msgId,
      sentAt: payload.sentAt
    }));
 }
}