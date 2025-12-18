// seed script - run after prisma generate
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.room.findFirst({ where: { name: 'general' }});
  if (!existing) {
    const room = await prisma.room.create({ data: { name: 'general', isPublic: true }});
    console.log('Created room:', room.id);
  } else {
    console.log('Room "general" already exists:', existing.id);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
