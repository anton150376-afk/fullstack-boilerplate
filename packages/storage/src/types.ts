// Адаптер ровно на четыре метода (раздел "Фаза 4" задания, пункт 8) — этот
// размер важен, он и переживает смену поставщика. Расширять интерфейс ради
// одного вызывающего места не нужно.

export interface CreateUploadTicketInput {
  key: string;
  contentType: string;
  maxBytes: number;
}

export interface UploadTicket {
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface FileMetadata {
  size: number;
  contentType: string;
}

export interface StorageAdapter {
  createUploadTicket(input: CreateUploadTicketInput): Promise<UploadTicket>;
  getDownloadUrl(key: string, ttlSec?: number): Promise<string>;
  head(key: string): Promise<FileMetadata | null>;
  delete(key: string): Promise<void>;
}
