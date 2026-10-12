import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createS3StorageAdapter, type StorageAdapter } from "@boilerplate/storage";

import type { Env } from "../config/env.schema.js";
import { STORAGE_ADAPTER } from "./files.constants.js";

export const storageAdapterProvider: Provider = {
  provide: STORAGE_ADAPTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): StorageAdapter =>
    createS3StorageAdapter({
      endpoint: config.get("S3_ENDPOINT", { infer: true }),
      publicEndpoint: config.get("S3_PUBLIC_ENDPOINT", { infer: true }),
      region: config.get("S3_REGION", { infer: true }),
      bucket: config.get("S3_BUCKET", { infer: true }),
      accessKeyId: config.get("S3_ACCESS_KEY_ID", { infer: true }),
      secretAccessKey: config.get("S3_SECRET_ACCESS_KEY", { infer: true }),
      forcePathStyle: config.get("S3_FORCE_PATH_STYLE", { infer: true }),
    }),
};
