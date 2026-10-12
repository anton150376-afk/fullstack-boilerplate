import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

// Минимальный детерминированный набор для тестов — не для показа. Сначала
// очищает таблицы, которые заполняет, затем создаёт заново: тест не должен
// зависеть от того, что в базе осталось после предыдущего прогона.
async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.note.deleteMany({});
  await prisma.note.create({
    data: { id: "00000000-0000-0000-0000-000000000001", title: "Тестовая заметка", body: "x" },
  });

  console.log("Тестовые данные готовы: 1 заметка");
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
