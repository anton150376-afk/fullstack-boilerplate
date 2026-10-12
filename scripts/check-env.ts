import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Проверяет, что переменные окружения, которые реально читает код,
// присутствуют и в `.env.example`, и в `docs/operations/env-vars.md`.
// Два способа чтения: прямой `process.env.FOO` и `configService.get("FOO")`
// (идиоматичный путь в Nest — @nestjs/config никогда не трогает
// process.env напрямую в прикладном коде). Второй шаблон нарочно узкий
// (только вызов `.get(...)` с ключом в кавычках), а не «любая строка
// заглавными буквами» — иначе он ловил бы случайные совпадения вроде
// `tz: "UTC"` в опциях BullMQ.

const ROOT = process.cwd();
// Переменные, которые выставляет сама платформа (GitHub Actions и любой другой CI):
// их не задают ни в .env, ни в документации переменных проекта.
const PLATFORM_VARS = new Set(["CI"]);
const ENV_VAR_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /\.get(?:<[^>]*>)?\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  // import.meta.env — чтение переменных окружения Vite (apps/web, Фаза 6).
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
];

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".output") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
}

function findUsedVars(): Set<string> {
  const files: string[] = [];
  for (const group of ["apps", "packages"]) {
    walk(join(ROOT, group), files);
  }

  const used = new Set<string>();
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const pattern of ENV_VAR_PATTERNS) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content))) used.add(match[1] ?? "");
    }
  }
  return used;
}

function parseEnvExampleKeys(): Set<string> {
  const path = join(ROOT, ".env.example");
  if (!existsSync(path)) return new Set();
  const keys = new Set<string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (match) keys.add(match[1] ?? "");
  }
  return keys;
}

function parseDocumentedKeys(): Set<string> {
  const path = join(ROOT, "docs", "operations", "env-vars.md");
  if (!existsSync(path)) return new Set();
  const keys = new Set<string>();
  const content = readFileSync(path, "utf8");
  const pattern = /`([A-Z][A-Z0-9_]*)`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) keys.add(match[1] ?? "");
  return keys;
}

function main(): void {
  const used = findUsedVars();
  if (used.size === 0) {
    console.log("check:env — пропущено: код ещё не читает process.env (появится с Фазы 4)");
    return;
  }

  const inExample = parseEnvExampleKeys();
  const documented = parseDocumentedKeys();
  const errors: string[] = [];

  for (const key of used) {
    if (PLATFORM_VARS.has(key)) continue;
    if (!inExample.has(key)) errors.push(`${key}: используется в коде, но нет в .env.example`);
    if (!documented.has(key))
      errors.push(`${key}: используется в коде, но не описана в docs/operations/env-vars.md`);
  }

  if (errors.length > 0) {
    console.error("check:env — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`check:env — ok (${used.size} переменных)`);
}

main();
