import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { verifyToken } from "./auth.js";
import { redis, subscriber } from "./redis-client.js";

dotenv.config();

const PORT = process.env.PORT_WS || 8080;

export const wss = new WebSocketServer({ port: Number(PORT) });
wss.on('connection',(ws)=>{
const userid=null;
ws.on('message',async(raw)=>{
    const message=raw.toString();
    
})
})