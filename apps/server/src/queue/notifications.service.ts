import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

import { NOTIFICATIONS_QUEUE } from "./queue.constants.js";

export interface NoteCreatedPayload {
  noteId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NoteCreatedPayload>,
  ) {}

  async notifyNoteCreated(noteId: string): Promise<void> {
    // jobId детерминированный — повторная постановка той же задачи (например,
    // при ретрае вызывающего кода) не создаёт вторую запись в очереди.
    // Без двоеточия: BullMQ отвергает пользовательский jobId с ":", если в нём
    // не ровно три части (notifications.service.spec.ts, регрессия).
    await this.queue.add(
      "note-created",
      { noteId },
      {
        jobId: `note-created-${noteId}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
      },
    );
  }
}
