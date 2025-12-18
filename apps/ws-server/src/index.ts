import { WebSocket as WsWebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
import { verifyToken } from "./auth.js";
import { redis, subscriber } from "./redis-client.js";
import { handleWsMessage } from "./ws-handler.js";
dotenv.config();

const PORT = process.env.PORT_WS || 8080;
console.log("WS Server running on", PORT);
const socket: Map<string, WsWebSocket> = new Map();
const roomMembers: Map<string, Set<string>> = new Map();
await subscriber.pSubscribe("room:*", (message, channel) => {
  try {
    const parts = channel.split(":");
    const roomId = parts[1];

    const data = JSON.parse(message);
        if(!roomId) return;
    const members = roomMembers.get(roomId);
    if (!members) return;

    for (const userId of members) {
      const ws = socket.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "message", ...data }));
      }
    }
  } catch (err) {
    console.error("Pub/Sub error:", err);
  }
});
export const wss = new WebSocketServer({ port: Number(PORT) });
wss.on('connection',(ws: WsWebSocket)=>{
let userId: string | null = null;
ws.on('message', async (raw) => {
    try{
 const msgStr = raw.toString();
    let msg: any;
    try {
        msg = JSON.parse(msgStr);
    } catch (e) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
    if (msg.type === 'auth') {
        const verifiedUserId = verifyToken(msg.token);
        userId = verifiedUserId === undefined ? null : verifiedUserId;
        if (!userId) {
            return ws.send(JSON.stringify({ type: 'error', message: 'Invalid Token' }));
        }
        socket.set(userId, ws);
        return ws.send(JSON.stringify({ type: 'auth-success', message: userId }));
    }
    if (!userId) {
        return ws.send(JSON.stringify({ type: "error", message: "Authenticate first" }));
    }
   await handleWsMessage({ ws, userId, roomMembers }, msg);
    }
    catch(err){
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' }));
    }
    ws.on("close", () => {
    if (userId) socket.delete(userId);

    
    for (const [roomId, members] of roomMembers.entries()) {
      if (userId && members.has(userId)) {
        members.delete(userId);
      }
    }
  });
})
})