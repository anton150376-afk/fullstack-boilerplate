import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OpenAPIGenerator } from "@orpc/openapi";
// zod4-подпуть обязателен — тот же разбор, что apps/server/src/openapi/openapi.controller.ts
// (раздел "Фаза 5" задания, пункт 5.1): корневой "@orpc/zod" читает типы
// из "zod/v3", не поймёт схемы Zod 4 из packages/contract.
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { contract } from "@boilerplate/contract";

// Раздел "Фаза 10" задания, пункт 10.3: страницы сайта документации
// порождаются из репозитория, не пишутся руками. Этот скрипт пишет в
// docs/generated/ — каталог в .gitignore, пересобирается перед каждой
// сборкой сайта (apps/docs/package.json: "generate" перед "dev"/"build").

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DOCS = join(ROOT, "docs");
const GENERATED = join(DOCS, "generated");

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function introBlock(zachem: string, komu: string): string {
  return `> **Зачем читать:** ${zachem}\n> **Кому:** ${komu}\n> **Последняя проверка:** ${today()} (сгенерировано \`apps/docs/scripts/generate.ts\`, не редактировать руками).\n\n`;
}

interface WorkspacePackage {
  name: string;
  dir: string;
  group: "apps" | "packages";
  deps: string[];
}

function listWorkspacePackages(): WorkspacePackage[] {
  const result: WorkspacePackage[] = [];
  for (const group of ["apps", "packages"] as const) {
    const base = join(ROOT, group);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      const pkgPath = join(base, entry, "package.json");
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const deps = Object.entries(allDeps)
        .filter(([, version]) => version.startsWith("workspace:"))
        .map(([name]) => name);
      result.push({ name: pkg.name ?? entry, dir: `${group}/${entry}`, group, deps });
    }
  }
  return result.sort((a, b) => a.dir.localeCompare(b.dir));
}

function generatePackagesGraph(): void {
  const header = "| Пакет | Каталог | Зависит от (workspace) |\n| --- | --- | --- |\n";
  const rows = listWorkspacePackages().map(
    (pkg) =>
      `| \`${pkg.name}\` | \`${pkg.dir}\` | ${pkg.deps.length > 0 ? pkg.deps.map((d) => `\`${d}\``).join(", ") : "—"} |`,
  );
  const content =
    introBlock(
      "какие пакеты и приложения есть в монорепозитории и кто от кого зависит",
      "кто добавляет пакет или импорт",
    ) +
    "# Пакеты и приложения\n\n" +
    header +
    rows.join("\n") +
    "\n";
  writeFileSync(join(GENERATED, "packages-graph.md"), content);
}

function generateModulesRoadmap(): void {
  const roadmapPath = join(ROOT, "ROADMAP.md");
  const modulesDir = join(DOCS, "modules");
  const lines = [
    introBlock(
      "что реализовано, что в работе, что не начато — из ROADMAP.md и docs/modules/*",
      "кто планирует следующий модуль",
    ),
    "# Карта модулей\n\n",
  ];
  if (existsSync(roadmapPath)) {
    // ROADMAP.md лежит в корне — его ссылки вида "docs/..." верны
    // оттуда, но не из docs/generated/, куда текст копируется целиком;
    // "](docs/" → "](../" делает их верными в обоих местах сразу.
    lines.push(readFileSync(roadmapPath, "utf8").replaceAll("](docs/", "](../"));
  } else {
    lines.push(
      "`ROADMAP.md` ещё не создан — появится в Фазе 11 задания. Эта страница обновится сама при следующей сборке сайта, как только файл появится.\n",
    );
  }
  if (existsSync(modulesDir)) {
    const pages = readdirSync(modulesDir).filter((f) => f.endsWith(".md"));
    if (pages.length > 0) {
      lines.push("\n## Страницы модулей (docs/modules/)\n\n");
      for (const page of pages) {
        lines.push(`- [${page}](../modules/${page})\n`);
      }
    }
  }
  writeFileSync(join(GENERATED, "modules-roadmap.md"), lines.join(""));
}

function parseOpenBacklogItems(): { id: string; title: string }[] {
  const content = readFileSync(join(DOCS, "BACKLOG.md"), "utf8");
  const openSection = content.split("## Открыто")[1]?.split("## В работе")[0] ?? "";
  const items: { id: string; title: string }[] = [];
  for (const line of openSection.split("\n")) {
    const match = /^\|\s*(B-\d{6}-[\w-]+)\s*\|\s*(.+?)\s*\|/.exec(line);
    if (match?.[1] && match[2]) {
      items.push({ id: match[1], title: match[2] });
    }
  }
  return items;
}

function listAdrs(): string[] {
  const dir = join(DOCS, "architecture", "decisions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith("ADR-") && f.endsWith(".md"))
    .sort();
}

function parseEnvRegistry(): { name: string; who: string }[] {
  const content = readFileSync(join(DOCS, "operations", "env-vars.md"), "utf8");
  const items: { name: string; who: string }[] = [];
  for (const line of content.split("\n")) {
    const match = /^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|\s*(.+?)\s*\|/.exec(line);
    if (match?.[1] && match[2]) {
      items.push({ name: match[1], who: match[2] });
    }
  }
  return items;
}

interface CoverageSummaryEntry {
  lines: { total: number; covered: number };
}

function parseCoverageByPackage(): { pkg: string; pct: number }[] | undefined {
  const summaryPath = join(ROOT, "coverage", "coverage-summary.json");
  if (!existsSync(summaryPath)) return undefined;
  const data = JSON.parse(readFileSync(summaryPath, "utf8")) as Record<
    string,
    CoverageSummaryEntry
  >;
  const totals = new Map<string, { covered: number; total: number }>();
  for (const [filePath, metrics] of Object.entries(data)) {
    if (filePath === "total") continue;
    const rel = filePath
      .replace(ROOT + "\\", "")
      .replace(ROOT + "/", "")
      .replace(/\\/g, "/");
    const match = /^(apps|packages)\/([^/]+)\//.exec(rel);
    if (!match?.[1] || !match[2]) continue;
    const pkg = `${match[1]}/${match[2]}`;
    const entry = totals.get(pkg) ?? { covered: 0, total: 0 };
    entry.covered += metrics.lines.covered;
    entry.total += metrics.lines.total;
    totals.set(pkg, entry);
  }
  return [...totals.entries()]
    .map(([pkg, { covered, total }]) => ({
      pkg,
      pct: total > 0 ? Math.round((covered / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.pkg.localeCompare(b.pkg));
}

function generateProjectStatus(): void {
  const lines: string[] = [
    introBlock(
      "сводка состояния репозитория — открытые риски, ADR, переменные окружения, покрытие тестами",
      "кто оценивает готовность или планирует следующий шаг",
    ),
    "# Статус проекта\n\n",
    "## Открытые пункты бэклога\n\n",
  ];

  const open = parseOpenBacklogItems();
  if (open.length === 0) {
    lines.push("Пусто.\n\n");
  } else {
    lines.push("| ID | Заголовок |\n| --- | --- |\n");
    for (const item of open) {
      lines.push(`| \`${item.id}\` | ${item.title} |\n`);
    }
    lines.push(
      "\nПолная таблица с приоритетом и критерием закрытия — [BACKLOG.md](../BACKLOG.md).\n\n",
    );
  }

  lines.push("## ADR\n\n");
  for (const adr of listAdrs()) {
    lines.push(`- [${adr.replace(".md", "")}](../architecture/decisions/${adr})\n`);
  }
  lines.push("\n## Переменные окружения (только имена и назначение)\n\n");
  lines.push("| Переменная | Кто читает |\n| --- | --- |\n");
  for (const entry of parseEnvRegistry()) {
    lines.push(`| \`${entry.name}\` | ${entry.who} |\n`);
  }
  lines.push(
    "\nЗначения — никогда здесь, только в `.env` на машине разработчика. Полная таблица с обязательностью и примером — [env-vars.md](../operations/env-vars.md).\n\n",
  );

  lines.push(
    "## Таблица паритета ui-web/ui-native\n\nСм. [packages/ui.md](../packages/ui.md).\n\n",
  );

  lines.push("## Покрытие тестами по пакетам\n\n");
  const coverage = parseCoverageByPackage();
  if (!coverage) {
    lines.push(
      "Отчёт не найден — выполните `pnpm test:coverage` перед сборкой сайта. `apps/mobile` и `packages/ui-native` считаются Jest'ом отдельно ([guides/testing.md](../guides/testing.md)) и сюда не входят.\n",
    );
  } else {
    lines.push("| Пакет/приложение | Строки покрыты |\n| --- | --- |\n");
    for (const entry of coverage) {
      lines.push(`| \`${entry.pkg}\` | ${entry.pct}% |\n`);
    }
    lines.push(
      "\n`apps/mobile` и `packages/ui-native` — Jest, не Vitest, в этот отчёт не входят ([guides/testing.md](../guides/testing.md)).\n",
    );
  }

  writeFileSync(join(GENERATED, "project-status.md"), lines.join(""));
}

async function generateApiReference(): Promise<void> {
  const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
  const spec = await generator.generate(contract, {
    info: { title: "Boilerplate API", version: "0.0.0" },
  });
  writeFileSync(join(GENERATED, "openapi.json"), JSON.stringify(spec, null, 2));

  const lines = [
    introBlock(
      "список маршрутов API, порождённый из того же контракта, что видит клиент",
      "кто вызывает API или добавляет маршрут",
    ),
    "# Справочник API\n\n",
    'Сгенерировано из `packages/contract` тем же генератором, что `GET /openapi.json` на сервере в разработке (раздел "Фаза 5" задания, пункт 5.1) — не переписано руками.\n\n',
    "| Метод | Путь | Описание |\n| --- | --- | --- |\n",
  ];
  const paths = spec.paths ?? {};
  const methodNames = ["get", "post", "patch", "put", "delete"] as const;
  for (const [path, operations] of Object.entries(paths)) {
    for (const method of methodNames) {
      const op = (
        operations as Record<string, { summary?: string; description?: string } | undefined>
      )[method];
      if (!op) continue;
      lines.push(
        `| ${method.toUpperCase()} | \`${path}\` | ${op.summary ?? op.description ?? "—"} |\n`,
      );
    }
  }
  lines.push("\nПолная OpenAPI-спецификация — [openapi.json](./openapi.json).\n");
  writeFileSync(join(GENERATED, "api-reference.md"), lines.join(""));
}

async function main(): Promise<void> {
  mkdirSync(GENERATED, { recursive: true });
  generatePackagesGraph();
  generateModulesRoadmap();
  generateProjectStatus();
  await generateApiReference();
  console.log("docs/generated/ — обновлено:", readdirSync(GENERATED).join(", "));
}

await main();
