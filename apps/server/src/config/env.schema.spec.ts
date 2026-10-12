import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { validateEnv } from "./env.schema.js";

const VALID: Record<string, unknown> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:3900",
  S3_REGION: "garage",
  S3_BUCKET: "app-files",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
};

describe("validateEnv", () => {
  it("принимает полный набор обязательных переменных и применяет значения по умолчанию", () => {
    const env = validateEnv(VALID);

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("падает с понятным сообщением, если обязательная переменная отсутствует", () => {
    const { DATABASE_URL: _DATABASE_URL, ...withoutDatabase } = VALID;

    expect(() => validateEnv(withoutDatabase)).toThrow(/DATABASE_URL/);
  });

  it("падает, если DATABASE_URL не является корректным URL", () => {
    expect(() => validateEnv({ ...VALID, DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("приводит строковые PORT и S3_FORCE_PATH_STYLE к нужным типам", () => {
    const env = validateEnv({ ...VALID, PORT: "4000", S3_FORCE_PATH_STYLE: "false" });

    expect(env.PORT).toBe(4000);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
  });

  it("S3_PUBLIC_ENDPOINT не обязателен, пустая строка считается незаданной", () => {
    expect(validateEnv(VALID).S3_PUBLIC_ENDPOINT).toBeUndefined();
    expect(validateEnv({ ...VALID, S3_PUBLIC_ENDPOINT: "" }).S3_PUBLIC_ENDPOINT).toBeUndefined();
    expect(
      validateEnv({ ...VALID, S3_PUBLIC_ENDPOINT: "http://localhost:3900" }).S3_PUBLIC_ENDPOINT,
    ).toBe("http://localhost:3900");
  });

  it("S3_PUBLIC_ENDPOINT с нечитаемым адресом падает с именем переменной", () => {
    expect(() => validateEnv({ ...VALID, S3_PUBLIC_ENDPOINT: "не адрес" })).toThrow(
      /S3_PUBLIC_ENDPOINT/,
    );
  });
});

// Образец .env.example копируют в .env (docs/guides/onboarding.md) — и сервер на
// хосте, и контейнеры (env_file) читают его как есть. Необязательные переменные
// стоят там пустыми; схема обязана принимать такой файл без правок.
describe(".env.example", () => {
  function parseExample(): Record<string, string> {
    const path = resolve(import.meta.dirname, "../../../../.env.example");
    const values: Record<string, string> = {};
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trimEnd());
      if (match) {
        values[match[1] ?? ""] = match[2] ?? "";
      }
    }
    return values;
  }

  it("проходит проверку схемы без единой правки", () => {
    expect(() => validateEnv(parseExample())).not.toThrow();
  });

  it("пустые необязательные переменные считаются незаданными", () => {
    const env = validateEnv({
      ...VALID,
      BUG_REPORT_GITHUB_OWNER: "",
      BUG_REPORT_GITHUB_REPO: "",
      BUG_REPORT_GITHUB_TOKEN: "",
    });

    expect(env.BUG_REPORT_GITHUB_OWNER).toBeUndefined();
    expect(env.BUG_REPORT_GITHUB_TOKEN).toBeUndefined();
  });

  it("приёмник github по-прежнему требует три переменные, даже если они пустые", () => {
    expect(() =>
      validateEnv({
        ...VALID,
        BUG_REPORT_RECEIVER: "github",
        BUG_REPORT_GITHUB_OWNER: "",
        BUG_REPORT_GITHUB_REPO: "",
        BUG_REPORT_GITHUB_TOKEN: "",
      }),
    ).toThrow(/BUG_REPORT_GITHUB_OWNER/);
  });
});
