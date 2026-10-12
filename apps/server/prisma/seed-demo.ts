import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

// Данные для показа и ручной проверки. Идемпотентно: повторный запуск не
// плодит дубликаты (findFirst по названию перед create — см. ниже).
async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const demoNotes = [
    { title: "Добро пожаловать", body: "Первая показательная заметка." },
    { title: "Вторая заметка", body: "Для проверки списка и пагинации." },
  ];

  for (const note of demoNotes) {
    // Название не является ключом сущности (в отличие от email пользователя,
    // например) — идемпотентность через findFirst+create, не через upsert
    // по неуникальному полю.
    const existing = await prisma.note.findFirst({ where: { title: note.title } });
    if (!existing) {
      await prisma.note.create({ data: note });
    }
  }

  console.log(`Демонстрационные данные готовы: ${demoNotes.length} заметок`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
