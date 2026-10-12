import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  CreateUploadTicketInput,
  FileMetadata,
  StorageAdapter,
  UploadTicket,
} from "./types.js";

export interface S3StorageConfig {
  /** Адрес хранилища для запросов сервера (head, delete). В Docker — имя сервиса compose. */
  endpoint: string;
  /**
   * Адрес, который видит клиент (браузер или приложение): в него попадают
   * URL подписанной формы и ссылки на скачивание. Не задан — используется
   * `endpoint`. Нужен, когда сервер и клиент видят хранилище по разным
   * адресам (контейнер: `http://garage:3900` и `http://localhost:3900`).
   */
  publicEndpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

const UPLOAD_TICKET_TTL_SEC = 300;
const DEFAULT_DOWNLOAD_TTL_SEC = 300;

// Отделено от createS3StorageAdapter, чтобы тесты могли передать мок
// S3Client и проверить head()/delete() без реального сетевого обращения —
// createUploadTicket/getDownloadUrl в такой подмене не нуждаются, они
// подписывают запрос локальной криптографией и сеть не трогают.
// presignClient подписывает URL для клиента (адрес из publicEndpoint), client
// ходит в хранилище сам (head, delete). Хост входит в подпись ссылки на
// скачивание, поэтому подменить его в готовой строке нельзя — нужен клиент
// с нужным адресом.
export function createS3StorageAdapterFromClient(
  client: S3Client,
  config: Pick<S3StorageConfig, "bucket">,
  presignClient: S3Client = client,
): StorageAdapter {
  return {
    async createUploadTicket({
      key,
      contentType,
      maxBytes,
    }: CreateUploadTicketInput): Promise<UploadTicket> {
      // Подписанный PUT не ограничивает размер (грабля 30 задания) —
      // политика подписанной формы POST входит в саму подпись, и
      // хранилище отвергает нарушение `content-length-range` само.
      const { url, fields } = await createPresignedPost(presignClient, {
        Bucket: config.bucket,
        Key: key,
        Expires: UPLOAD_TICKET_TTL_SEC,
        Conditions: [
          ["content-length-range", 0, maxBytes],
          ["eq", "$Content-Type", contentType],
        ],
        Fields: {
          "Content-Type": contentType,
        },
      });

      return {
        url,
        fields,
        expiresAt: new Date(Date.now() + UPLOAD_TICKET_TTL_SEC * 1000),
      };
    },

    getDownloadUrl(key: string, ttlSec = DEFAULT_DOWNLOAD_TTL_SEC): Promise<string> {
      return getSignedUrl(
        presignClient,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: ttlSec },
      );
    },

    async head(key: string): Promise<FileMetadata | null> {
      try {
        const result = await client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return {
          size: result.ContentLength ?? 0,
          contentType: result.ContentType ?? "application/octet-stream",
        };
      } catch (error) {
        if (error instanceof NotFound) {
          return null;
        }
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}

export function createS3StorageAdapter(config: S3StorageConfig): StorageAdapter {
  const createClient = (endpoint: string) =>
    new S3Client({
      endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Грабля 29 задания: начиная с 3.729.0 AWS SDK отправляет контрольные
      // суммы CRC32 на всех PUT и проверяет их на GET по умолчанию
      // (`WHEN_SUPPORTED`) — S3-совместимые серверы, не являющиеся AWS
      // (Garage и подобные), на это не рассчитаны и отказывают запросу.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

  const client = createClient(config.endpoint);
  const presignClient = config.publicEndpoint ? createClient(config.publicEndpoint) : client;

  return createS3StorageAdapterFromClient(client, config, presignClient);
}
