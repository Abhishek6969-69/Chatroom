import express from "express";
import { prisma } from "../../../prisma/client.js";
import { authmiddleware } from "../middleware/middleware.js";

const router = express.Router();

// All room routes require auth
router.use(authmiddleware);

// GET /rooms - list all rooms
router.get("/", async (req: any, res) => {
  try {
    console.log('[rooms] GET /rooms by userId:', req.user?.userId);
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    });
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "internal" });
  }
});

// POST /rooms - create a new room
router.post("/", async (req: any, res) => {
  try {
    const nameRaw = (req.body?.name ?? "").toString().trim();
    if (!nameRaw) return res.status(400).json({ error: "Room name required" });

    const room = await prisma.room.create({
      data: {
        name: nameRaw,
        createdBy: req.user?.userId ?? "",
      },
      select: { id: true, name: true, createdAt: true },
    });

    return res.status(201).json({ room });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Room name already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
});

// POST /rooms/:roomId/join - join a room
router.post("/:roomId/join", async (req: any, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // ensure room exists
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: "Room not found" });

    await prisma.membership.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: { roomId, userId },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
});

// GET /rooms/:roomId/history
router.get("/:roomId/history", async (req, res) => {
  try {
    const { roomId } = req.params;

    const limitParam = req.query.limit;
    const limitStr = Array.isArray(limitParam)
      ? limitParam[0]
      : typeof limitParam === "string"
      ? limitParam
      : "50";
    const limit = Math.min(parseInt(String(limitStr), 10), 200);

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { sender: true },
    });

    res.json(messages.reverse()); // oldest → newest
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "internal" });
  }
});

export default router;
