import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import { MaintenanceProcessor } from "./maintenance.processor.js";
import { CLEANUP_PENDING_UPLOADS_JOB } from "./queue.constants.js";

function createPrismaMock() {
  return {
    uploadedFile: {
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  };
}

function createJob(name: string): Job {
  return { name, data: {} } as Job;
}

describe("MaintenanceProcessor", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let processor: MaintenanceProcessor;

  beforeEach(() => {
    prisma = createPrismaMock();
    processor = new MaintenanceProcessor(prisma as unknown as PrismaService);
  });

  it("помечает FAILED записи UploadedFile в ожидании старше порога", async () => {
    await processor.process(createJob(CLEANUP_PENDING_UPLOADS_JOB));

    expect(prisma.uploadedFile.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", createdAt: { lt: expect.any(Date) as Date } },
      data: { status: "FAILED" },
    });
  });

  it("игнорирует задачи с неизвестным именем", async () => {
    await processor.process(createJob("unknown-job"));

    expect(prisma.uploadedFile.updateMany).not.toHaveBeenCalled();
  });
});
