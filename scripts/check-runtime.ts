import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Серверу в рантайме нужны пакеты воркспейса (contract, storage, devtools).
// По умолчанию они отдают сырой TypeScript (exports -> src/*.ts): так их
// читают Vite, Metro, tsc и Vitest. Обычный Node такие файлы не загружает
// (импорты с расширением .js указывают на .ts), поэтому в продакшене сервер
// запускается как `node --conditions=compiled`, а у каждого пакета есть
// условие compiled -> dist/*.js (docs/architecture/monorepo.md).
//
// Проверка защищает от возврата к состоянию, при котором `node dist/main.js`
// падал на первом же импорте контракта (найдено живым запуском сервера):
//  1. каждая зависимость apps/server вида workspace:* имеет условие compiled
//     у каждой точки входа, и файл существует (пакет собран);
//  2. каждая такая точка входа реально загружается Node с этим условием.
//
// Выполняется после сборки: dist создают lint и typecheck через turbo.

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "apps", "server");

interface PackageJson {
  dependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
}

function readJson(path: string): PackageJson {
  return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
}

function main(): void {
  const errors: string[] = [];
  const server = readJson(join(SERVER_DIR, "package.json"));
  const workspaceDeps = Object.entries(server.dependencies ?? {})
    .filter(([, version]) => version.startsWith("workspace:"))
    .map(([name]) => name);

  const specifiers: string[] = [];

  for (const name of workspaceDeps) {
    const directory = join(ROOT, "packages", name.replace("@boilerplate/", ""));
    const manifestPath = join(directory, "package.json");
    if (!existsSync(manifestPath)) {
      errors.push(`${name}: нет packages/${name.replace("@boilerplate/", "")}/package.json`);
      continue;
    }
    const entries = Object.entries(readJson(manifestPath).exports ?? {});
    if (entries.length === 0) {
      errors.push(`${name}: нет поля exports`);
      continue;
    }
    for (const [key, target] of entries) {
      const compiled =
        typeof target === "object" && target !== null
          ? (target as { compiled?: unknown }).compiled
          : undefined;
      if (typeof compiled !== "string") {
        errors.push(
          `${name}: у точки входа «${key}» нет условия compiled — сервер в продакшене не сможет её загрузить. ` +
            `Добавьте "compiled": "./dist/….js" и скрипт build (пример: packages/contract/package.json)`,
        );
        continue;
      }
      if (!existsSync(join(directory, compiled))) {
        errors.push(
          `${name}: «${key}» ссылается на ${compiled}, но файла нет — пакет не собран (pnpm build)`,
        );
        continue;
      }
      specifiers.push(key === "." ? name : `${name}${key.slice(1)}`);
    }
  }

  for (const specifier of specifiers) {
    try {
      execFileSync(
        process.execPath,
        [
          "--conditions=compiled",
          "--input-type=module",
          "-e",
          `await import(${JSON.stringify(specifier)})`,
        ],
        { cwd: SERVER_DIR, stdio: "pipe" },
      );
    } catch (error) {
      const stderr = (error as { stderr?: Buffer }).stderr?.toString().split("\n")[0] ?? "";
      errors.push(
        `${specifier}: Node с --conditions=compiled не загружает пакет (${stderr.trim()})`,
      );
    }
  }

  if (errors.length > 0) {
    console.error("check:runtime — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `check:runtime — ok (загружаются под Node: ${specifiers.join(", ") || "нет пакетов"})`,
  );
}

main();
