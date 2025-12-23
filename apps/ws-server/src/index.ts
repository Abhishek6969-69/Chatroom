import { WebSocket as WsWebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
import { verifyToken } from "./auth.js";
import { redis, subscriber } from "./redis-client.js";
import { ROOM_CHANNEL_PREFIX } from "./constants.js";
import { handleWsMessage } from "./ws-handler.js";
dotenv.config();

const PORT = process.env.PORT_WS || 8080;
console.log("WS Server running on", PORT);
const socket: Map<string, WsWebSocket> = new Map();
const roomMembers: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds
const userRooms: Map<string, Set<string>> = new Map(); // userId -> Set of roomIds (for faster lookup)

// Queue to ensure pub/sub messages are processed sequentially
let pubSubProcessingQueue: Promise<void> = Promise.resolve();

// Track processed messages to detect duplicates or missing messages
const processedMessages = new Set<string>();

// Subscribe to pub/sub pattern - MUST be done before starting server
console.log('[pubsub] 🔌 Initializing pub/sub subscription...');
let subscriptionReady = false;

// Set up the subscription handler with error handling
try {
  await subscriber.pSubscribe(`${ROOM_CHANNEL_PREFIX}*`, (message, channel) => {
    // Process messages sequentially to prevent race conditions
    // Add a delay to ensure the previous message is fully processed
    pubSubProcessingQueue = pubSubProcessingQueue.then(async () => {
      // Delay to ensure previous message delivery is complete
      // This prevents messages from being dropped when sent quickly
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[pubsub] ========================================');
      console.log('[pubsub] 📨 PUB/SUB MESSAGE RECEIVED');
      console.log('[pubsub] 📨 Channel:', channel);
      console.log('[pubsub] 📨 Raw message:', message);
      console.log('[pubsub] 📨 Current roomMembers:', Object.fromEntries(Array.from(roomMembers.entries()).map(([k, v]) => [k, Array.from(v)])));
      console.log('[pubsub] 📨 Current userRooms:', Object.fromEntries(Array.from(userRooms.entries()).map(([k, v]) => [k, Array.from(v)])));
      console.log('[pubsub] 📨 Total sockets:', socket.size, '| Socket IDs:', Array.from(socket.keys()));
      
      try {
        const parts = channel.split(":");
        const roomId = parts[1];
        if (!roomId) {
          console.log('[pubsub] ❌ Could not extract roomId from channel:', channel);
          return; // Return from the async function, not the callback
        }

        const data = JSON.parse(message);
        const msgId = data.id;
        
        // Check for duplicate messages
        if (processedMessages.has(msgId)) {
          console.log('[pubsub] ⚠️ Duplicate message detected (already processed):', msgId);
          return;
        }
        
        // Mark as processed
        processedMessages.add(msgId);
        
        // Clean up old message IDs (keep last 1000 to prevent memory leak)
        if (processedMessages.size > 1000) {
          const firstIter = processedMessages.values().next();
          if (!firstIter.done && firstIter.value !== undefined) {
            processedMessages.delete(firstIter.value as string);
          }
        }
        
        console.log('[pubsub] 📨 Parsed data - roomId:', roomId, '| msgId:', msgId, '| content:', data.content, '| senderId:', data.senderId);
      
      let members = roomMembers.get(roomId);
      const messagePayload = JSON.stringify({ type: "message", ...data });
      let delivered = 0;
      const deliveryStatus = [];
      const deliveredUserIds = new Set<string>();

      // Strategy 1: Deliver to tracked room members (primary method)
      if (members && members.size > 0) {
        console.log('[pubsub] 👥 Room members:', Array.from(members), '| Total:', members.size);
        
        for (const userId of members) {
          const ws = socket.get(userId);
          if (ws && ws.readyState === WsWebSocket.OPEN) {
            try {
              // Don't send duplicate to sender (they already got echo from ws-handler)
              if (userId === data.senderId) {
                console.log('[pubsub] ⏭️ Skipping sender', userId, '(already received echo)');
                deliveredUserIds.add(userId);
                deliveryStatus.push({ userId, status: 'skipped-sender' });
                continue;
              }
              
              ws.send(messagePayload);
              delivered++;
              deliveredUserIds.add(userId);
              deliveryStatus.push({ userId, status: 'delivered' });
              console.log('[pubsub] ✅ Delivered to room member:', userId);
            } catch (err) {
              console.error('[pubsub] ❌ Error sending to user', userId, ':', err);
              deliveryStatus.push({ userId, status: 'send-error' });
            }
          } else {
            const status = ws ? 'closed' : 'not-connected';
            deliveryStatus.push({ userId, status });
            console.log('[pubsub] ⚠️ Cannot deliver to', userId, '-', status);
          }
        }
      } else {
        console.log('[pubsub] ⚠️ NO MEMBERS in room', roomId, 'in memory map');
        console.log('[pubsub] Available rooms:', Array.from(roomMembers.keys()));
        console.log('[pubsub] Total connected sockets:', socket.size);
      }

      // Strategy 2: Use fallback for users who might be in the room but not tracked in roomMembers
      // Check userRooms map to find users who are in this room
      let fallbackDelivered = 0;
      for (const [userId, roomSet] of userRooms) {
        // Skip sender and already delivered users
        if (userId === data.senderId || deliveredUserIds.has(userId)) {
          continue;
        }
        
        // Check if this user is in the target room
        if (roomSet.has(roomId)) {
          const ws = socket.get(userId);
          if (ws && ws.readyState === WsWebSocket.OPEN) {
            try {
              ws.send(messagePayload);
              fallbackDelivered++;
              deliveredUserIds.add(userId);
              deliveryStatus.push({ userId, status: 'delivered-via-fallback' });
              console.log('[pubsub] 🔄 Fallback delivered to user in room:', userId);
            } catch (err) {
              console.error('[pubsub] ❌ Error sending fallback to user', userId, ':', err);
            }
          }
        }
      }
      
      // Strategy 3: Broadcast ONLY to users who haven't received the message yet
      // This is a safety net for users who might not be in roomMembers/userRooms
      // Skip users already delivered to prevent duplicates
      let broadcastDelivered = 0;
      const expectedRecipients = members ? members.size - (data.senderId && members.has(data.senderId) ? 1 : 0) : 0;
      const actualDelivered = delivered + fallbackDelivered;
      
      // Only broadcast if we haven't delivered to all expected recipients
      if (actualDelivered < expectedRecipients || !members || members.size === 0) {
        console.log('[pubsub] 📡 Broadcasting to undelivered sockets (expected:', expectedRecipients, 'delivered:', actualDelivered, ')');
        console.log('[pubsub] 📡 Sender ID:', data.senderId, '| Already delivered to:', Array.from(deliveredUserIds));
        
        for (const [userId, ws] of socket) {
          // Skip sender AND already delivered users to prevent duplicates
          if (userId === data.senderId || deliveredUserIds.has(userId)) {
            continue;
          }
          
          if (ws && ws.readyState === WsWebSocket.OPEN) {
            try {
              ws.send(messagePayload);
              broadcastDelivered++;
              deliveredUserIds.add(userId);
              deliveryStatus.push({ userId, status: 'delivered-via-broadcast' });
              console.log('[pubsub] 📡 Broadcast sent to:', userId);
            } catch (err) {
              console.error('[pubsub] ❌ Error sending broadcast to user', userId, ':', err);
              deliveryStatus.push({ userId, status: 'broadcast-error' });
            }
          } else {
            console.log('[pubsub] ⚠️ Cannot broadcast to', userId, '- socket not open');
          }
        }
        console.log('[pubsub] 📡 Broadcast complete - sent to', broadcastDelivered, 'additional sockets');
      } else {
        console.log('[pubsub] ✅ All expected recipients already delivered, skipping broadcast to prevent duplicates');
      }
      
      const totalDelivered = delivered + fallbackDelivered + broadcastDelivered;
      if (fallbackDelivered > 0) {
        console.log('[pubsub] 🔄 Fallback delivered to', fallbackDelivered, 'additional sockets');
      }
      
      const successfulDeliveries = deliveryStatus.filter(s => 
        s.status === 'delivered' || 
        s.status === 'delivered-via-fallback' || 
        s.status === 'delivered-via-broadcast'
      );
      
      console.log('[pubsub] ✅ DELIVERY SUMMARY:');
      console.log('[pubsub] ✅ Room:', roomId);
      console.log('[pubsub] ✅ Message ID:', data.id);
      console.log('[pubsub] ✅ Sender:', data.senderId);
      console.log('[pubsub] ✅ Strategy 1 (roomMembers):', delivered, 'deliveries');
      console.log('[pubsub] ✅ Strategy 2 (userRooms):', fallbackDelivered, 'deliveries');
      console.log('[pubsub] ✅ Strategy 3 (broadcast):', broadcastDelivered, 'deliveries');
      console.log('[pubsub] ✅ TOTAL DELIVERED:', totalDelivered);
      console.log('[pubsub] ✅ Successful deliveries:', successfulDeliveries.length);
      console.log('[pubsub] ✅ Delivered to users:', successfulDeliveries.map(s => s.userId));
      console.log('[pubsub] ✅ Tracked room members:', members?.size || 0);
      console.log('[pubsub] ✅ Total connected sockets:', socket.size);
      console.log('[pubsub] ========================================');
      } catch (err) {
        console.error("[pubsub] ❌ Error processing pub/sub message:", err);
      }
    }).catch((err) => {
      console.error("[pubsub] ❌ Error in pub/sub processing queue:", err);
    });
  });
  
  // Wait a brief moment to ensure subscription is active
  await new Promise(resolve => setTimeout(resolve, 100));
  subscriptionReady = true;
  console.log('[pubsub] ✅ Subscription established');
} catch (err) {
  console.error('[pubsub] ❌ Failed to establish subscription:', err);
  throw err;
}

console.log('[pubsub] 🎯 PubSub ready - starting WebSocket server');

export const wss = new WebSocketServer({ port: Number(PORT) });
wss.on('connection',(ws: WsWebSocket)=>{
  let userId: string | null = null;
  console.log('New WebSocket connection');
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('message', async (raw) => {
    try {
      const msgStr = raw.toString();
      console.log('Received message:', msgStr);
      let msg: any;
      try {
        msg = JSON.parse(msgStr);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
      
      if (msg.type === 'auth') {
        console.log('Auth attempt with token:', msg.token?.substring(0, 20) + '...');
        const verifiedUserId = verifyToken(msg.token);
        console.log('Verified userId:', verifiedUserId);
        userId = verifiedUserId === undefined ? null : verifiedUserId;
        if (!userId) {
          console.log('Auth failed - invalid token');
          return ws.send(JSON.stringify({ type: 'error', message: 'Invalid Token' }));
        }
        socket.set(userId, ws);
        console.log('Auth successful for user:', userId);
        return ws.send(JSON.stringify({ type: 'auth-success', message: userId }));
      }
      
      if (!userId) {
        return ws.send(JSON.stringify({ type: "error", message: "Authenticate first" }));
      }
      
      await handleWsMessage({ ws, userId, roomMembers, userRooms }, msg);
    } catch(err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' }));
    }
  });
  
  ws.on("close", () => {
    console.log('WebSocket closed for user:', userId);
    if (userId) {
      socket.delete(userId);
      
      // Clean up roomMembers
      for (const [roomId, members] of roomMembers.entries()) {
        if (members.has(userId)) {
          members.delete(userId);
        }
      }
      
      // Clean up userRooms
      userRooms.delete(userId);
    }
  });
});