import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { FilesRepository } from "../src/files/files.repository.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { NotesRepository } from "../src/notes/notes.repository.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { TasksRepository } from "../src/tasks/tasks.repository.js";

// Репозитории против настоящей схемы Postgres: все остальные тесты сервера
// подменяют Prisma целиком и не видят расхождений между кодом и миграциями.
// Выполняется только при заданном TEST_DATABASE_URL (база с применёнными
// миграциями: `pnpm --filter server db:deploy`); без него набор пропущен, и
// офлайн-гейт не требует базы. В CI база есть всегда (.github/workflows/ci.yml).
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("репозитории на настоящей схеме (TEST_DATABASE_URL)", () => {
  let prisma: PrismaClient;
  let tasks: TasksRepository;
  let notes: NotesRepository;
  let files: FilesRepository;

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    // PrismaService — тот же PrismaClient плюс хуки жизненного цикла Nest,
    // репозиториям нужен только клиент.
    const service = prisma as unknown as PrismaService;
    tasks = new TasksRepository(service);
    notes = new NotesRepository(service);
    files = new FilesRepository(service);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.uploadedFile.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("TasksRepository", () => {
    it("create выдаёт идентификатор, done=false и обе даты", async () => {
      const task = await tasks.create({ title: "Купить молоко" });

      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.done).toBe(false);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it("setDone меняет отметку и сдвигает updatedAt", async () => {
      const created = await tasks.create({ title: "Позвонить" });

      const updated = await tasks.setDone(created.id, true);

      expect(updated.done).toBe(true);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
      expect((await tasks.findById(created.id))?.done).toBe(true);
    });

    it("findAll отдаёт новые задачи первыми", async () => {
      await tasks.create({ title: "первая" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      await tasks.create({ title: "вторая" });

      const all = await tasks.findAll();

      expect(all.map((task) => task.title)).toEqual(["вторая", "первая"]);
    });

    it("delete удаляет, findById на неизвестный id даёт null", async () => {
      const created = await tasks.create({ title: "Удалить" });

      await tasks.delete(created.id);

      expect(await tasks.findById(created.id)).toBeNull();
    });

    it("setDone на несуществующий id отклоняется ошибкой Prisma P2025", async () => {
      await expect(
        tasks.setDone("00000000-0000-0000-0000-000000000000", true),
      ).rejects.toMatchObject({ code: "P2025" });
    });
  });

  describe("NotesRepository", () => {
    it("create, update и delete проходят полный цикл", async () => {
      const created = await notes.create({ title: "Заголовок", body: "Текст" });

      const updated = await notes.update(created.id, { title: "Новый заголовок" });
      expect(updated.title).toBe("Новый заголовок");
      expect(updated.body).toBe("Текст");

      await notes.delete(created.id);
      expect(await notes.findById(created.id)).toBeNull();
    });
  });

  describe("FilesRepository", () => {
    it("createPending создаёт запись в статусе PENDING, markReady переводит в READY", async () => {
      const pending = await files.createPending("uploads/a.png", "image/png");
      expect(pending.status).toBe("PENDING");

      const ready = await files.markReady(pending.id, 1024, "image/png");

      expect(ready.status).toBe("READY");
      expect(ready.size).toBe(1024);
      expect(ready.confirmedAt).toBeInstanceOf(Date);
    });

    it("ключ объекта уникален: повторная запись с тем же key отклоняется (P2002)", async () => {
      await files.createPending("uploads/same.png", "image/png");

      await expect(files.createPending("uploads/same.png", "image/png")).rejects.toMatchObject({
        code: "P2002",
      });
    });
  });
});
