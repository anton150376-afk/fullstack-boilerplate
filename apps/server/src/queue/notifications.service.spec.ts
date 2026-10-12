import { Job } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import { NotificationsService } from "./notifications.service.js";

type AddArgs = [string, { noteId: string }, { jobId?: string }];
type NotificationsQueue = ConstructorParameters<typeof NotificationsService>[0];

// Проверка пользовательского jobId, которую BullMQ выполняет в Queue.add ещё
// до обращения к Redis. Метод читает только opts, name и stacktrace, поэтому
// вызывается без очереди и без базы.
function validateLikeBullMq(name: string, data: unknown, opts: { jobId?: string }): void {
  const job = { name, opts, stacktrace: [] as string[] };
  (
    Job.prototype as unknown as { validateOptions(this: unknown, jobData: unknown): void }
  ).validateOptions.call(job, {
    data: JSON.stringify(data),
  });
}

describe("NotificationsService.notifyNoteCreated", () => {
  const NOTE_ID = "0d44f21e-2be5-491c-a455-c40be600c76e";

  async function enqueue(noteId = NOTE_ID): Promise<AddArgs> {
    const add = vi.fn().mockResolvedValue(undefined);
    await new NotificationsService({ add } as unknown as NotificationsQueue).notifyNoteCreated(
      noteId,
    );
    return add.mock.calls[0] as AddArgs;
  }

  it("ставит задачу note-created с noteId", async () => {
    const [name, data] = await enqueue();

    expect(name).toBe("note-created");
    expect(data).toEqual({ noteId: NOTE_ID });
  });

  it("jobId проходит проверку самого BullMQ", async () => {
    const [name, data, opts] = await enqueue();

    expect(() => {
      validateLikeBullMq(name, data, opts);
    }).not.toThrow();
  });

  // Регрессия: jobId вида `note-created:<id>` BullMQ отвергает ("Custom Id
  // cannot contain :"), если в нём не ровно три части через двоеточие.
  // Каждый POST /notes падал с 500 после вставки строки в базу, а тесты этого
  // не видели, потому что подменяли очередь. Нашёл живой запуск сервера.
  it("BullMQ отвергает jobId с двоеточием из двух частей", () => {
    expect(() => {
      validateLikeBullMq("note-created", {}, { jobId: `note-created:${NOTE_ID}` });
    }).toThrow(/cannot contain :/);
  });

  it("jobId детерминированный: повторная постановка той же заметки даёт тот же идентификатор", async () => {
    const first = await enqueue();
    const second = await enqueue();

    expect(first[2].jobId).toBeDefined();
    expect(first[2].jobId).toBe(second[2].jobId);
  });

  it("разные заметки получают разные jobId", async () => {
    const first = await enqueue("note-one");
    const second = await enqueue("note-two");

    expect(first[2].jobId).not.toBe(second[2].jobId);
  });
});
