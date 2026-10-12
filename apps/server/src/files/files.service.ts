import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";

import type { CreateUploadTicketInput, UploadTicket } from "@boilerplate/contract";
import type { StorageAdapter } from "@boilerplate/storage";

import { MAX_UPLOAD_BYTES, SIGNATURE_SNIFF_BYTES, STORAGE_ADAPTER } from "./files.constants.js";
import { FilesRepository } from "./files.repository.js";

// Расширение сохраняется (удобно для скачивания и для систем, которым
// важно имя файла), остальное имя клиента — не доверенное значение и в
// ключ объекта не попадает.
function safeExtension(filename: string): string {
  const match = /\.([a-zA-Z0-9]{1,10})$/.exec(filename);
  return match ? `.${(match[1] ?? "").toLowerCase()}` : "";
}

@Injectable()
export class FilesService {
  constructor(
    private readonly repository: FilesRepository,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async createUploadTicket(input: CreateUploadTicketInput): Promise<UploadTicket> {
    const key = `uploads/${randomUUID()}${safeExtension(input.filename)}`;
    const record = await this.repository.createPending(key, input.contentType);

    const ticket = await this.storage.createUploadTicket({
      key,
      contentType: input.contentType,
      maxBytes: MAX_UPLOAD_BYTES,
    });

    return { fileId: record.id, ...ticket };
  }

  // Привязка файла к сущности в два шага (раздел "Фаза 4" задания,
  // пункт 8): талон → загрузка клиентом напрямую в хранилище →
  // подтверждение → серверный head() + проверка подписи → готовое
  // состояние. Размеру и типу, заявленным при выдаче талона, не доверяем —
  // здесь перепроверяется то, что хранилище реально получило.
  async confirm(id: string): Promise<{ id: string; size: number; contentType: string }> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundException(`Запись о файле ${id} не найдена`);
    }

    const metadata = await this.storage.head(record.key);
    if (!metadata) {
      await this.repository.markFailed(id);
      throw new BadRequestException("Файл не найден в хранилище — загрузка не завершена");
    }
    if (metadata.size > MAX_UPLOAD_BYTES) {
      await this.repository.markFailed(id);
      throw new BadRequestException("Файл превышает допустимый размер");
    }

    const realType = await this.detectRealContentType(record.key);
    if (!realType) {
      await this.repository.markFailed(id);
      throw new BadRequestException("Не удалось определить тип файла по сигнатуре — файл отклонён");
    }

    const updated = await this.repository.markReady(id, metadata.size, realType);
    return { id: updated.id, size: metadata.size, contentType: realType };
  }

  // Четвёртый метод адаптера (getDownloadUrl) — единственный способ
  // прочитать реальные байты файла без добавления пятого метода в
  // StorageAdapter (раздел "Фаза 4" задания: ровно четыре метода).
  private async detectRealContentType(key: string): Promise<string | undefined> {
    const url = await this.storage.getDownloadUrl(key, 60);
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${SIGNATURE_SNIFF_BYTES - 1}` },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);
    return detected?.mime;
  }
}
