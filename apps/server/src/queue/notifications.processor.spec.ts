import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsProcessor } from "./notifications.processor.js";
import type { NoteCreatedPayload } from "./notifications.service.js";

function createPrismaMock() {
  return {
    processedJob: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => Promise.resolve(fn(mockPrisma))),
  };
}

let mockPrisma: ReturnType<typeof createPrismaMock>;

function createJob(overrides: Partial<Job<NoteCreatedPayload>> = {}): Job<NoteCreatedPayload> {
  return {
    id: "note-created-1",
    name: "note-created",
    data: { noteId: "1" },
    ...overrides,
  } as Job<NoteCreatedPayload>;
}

describe("NotificationsProcessor", () => {
  let processor: NotificationsProcessor;

  beforeEach(() => {
    mockPrisma = createPrismaMock();
    processor = new NotificationsProcessor(mockPrisma as unknown as PrismaService);
  });

  it("выполняет побочный эффект и пишет ключ идемпотентности, если задача новая", async () => {
    mockPrisma.processedJob.findUnique.mockResolvedValue(null);

    await processor.process(createJob());

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.processedJob.create).toHaveBeenCalledWith({
      data: { idempotencyKey: "note-created-1", jobName: "note-created" },
    });
  });

  it("не повторяет побочный эффект, если ключ идемпотентности уже записан", async () => {
    mockPrisma.processedJob.findUnique.mockResolvedValue({
      idempotencyKey: "note-created-1",
      jobName: "note-created",
      processedAt: new Date(),
    });

    await processor.process(createJob());

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("бросает ошибку, если у задачи нет jobId", async () => {
    await expect(processor.process(createJob({ id: undefined }))).rejects.toThrow(/jobId/);
  });
});
