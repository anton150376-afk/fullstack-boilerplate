import { describe, expect, it } from "vitest";

import { validateEnv } from "../config/env.schema.js";
import { createCorsOptions } from "./cors.js";

const baseEnv = {
  DATABASE_URL: "postgresql://app:app@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:3900",
  S3_REGION: "garage",
  S3_BUCKET: "app-files",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
};

describe("createCorsOptions", () => {
  it("пустой список оставляет CORS выключенным", () => {
    expect(createCorsOptions([])).toBeUndefined();
  });

  it("разрешает только перечисленные адреса и открывает X-Request-Id", () => {
    const options = createCorsOptions(["http://localhost:3001", "http://localhost:3002"]);

    expect(options?.origin).toEqual(["http://localhost:3001", "http://localhost:3002"]);
    expect(options?.exposedHeaders).toEqual(["X-Request-Id"]);
    expect(options?.credentials).toBeUndefined();
  });
});

describe("CORS_ORIGINS в схеме окружения", () => {
  it("по умолчанию — пустой список", () => {
    expect(validateEnv(baseEnv).CORS_ORIGINS).toEqual([]);
  });

  it("разбирает список через запятую и обрезает пробелы", () => {
    const env = validateEnv({
      ...baseEnv,
      CORS_ORIGINS: " http://localhost:3001 , https://app.example.com ,",
    });

    expect(env.CORS_ORIGINS).toEqual(["http://localhost:3001", "https://app.example.com"]);
  });

  it("отвергает значение с путём или слэшем в конце: браузер сравнивает адрес источника строго", () => {
    expect(() => validateEnv({ ...baseEnv, CORS_ORIGINS: "http://localhost:3001/" })).toThrow(
      /CORS_ORIGINS/,
    );
    expect(() => validateEnv({ ...baseEnv, CORS_ORIGINS: "localhost:3001" })).toThrow(
      /CORS_ORIGINS/,
    );
  });
});
