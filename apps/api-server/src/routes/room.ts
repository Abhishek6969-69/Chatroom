import express from "express";
// import { prisma } from "../index.js";
import { prisma } from "../prisma/client.js";

const router = express.Router();

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
