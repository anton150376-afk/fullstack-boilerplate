import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Раздел "Фаза 12" задания, пункт 12.2.1: создание нового проекта из
// коробки. Идемпотентен — каждый шаг проверяет, нужно ли ему что-то
// делать, прежде чем делать; повторный запуск с теми же аргументами
// не повторяет уже сделанное и не падает. Заканчивается прогоном гейта.
//
// Что НЕ делает: не трогает выбор мобильного/админки/языков/файлов/очередей
// — это отдельный, осознанный шаг после (docs/guides/trimming.md).
// Убирает только одну демонстрационную сущность (Notes) — она здесь
// единственная, это не общий механизм для произвольных сущностей.

const ROOT = resolve(process.cwd());

interface Options {
  name: string;
  scope: string;
  description: string;
  resetGit: boolean;
  skipGate: boolean;
}

function printUsageAndExit(): never {
  console.error(
    [
      "Использование:",
      "  tsx scripts/init-project.ts --name <имя проекта> [опции]",
      "",
      "Опции:",
      "  --scope <npm-scope>     Новый scope пакетов (по умолчанию — из --name)",
      "  --description <текст>   Описание в корневом package.json",
      "  --no-git-reset           Не сбрасывать историю git",
      "  --skip-gate              Не запускать pnpm gate в конце (для отладки скрипта)",
    ].join("\n"),
  );
  process.exit(1);
}

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };

  const name = get("--name");
  if (!name) {
    printUsageAndExit();
  }

  return {
    name,
    scope: get("--scope") ?? toKebabCase(name),
    description: get("--description") ?? `${name} — создан из boilerplate.`,
    resetGit: !args.includes("--no-git-reset"),
    skipGate: args.includes("--skip-gate"),
  };
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function writeJson(path: string, data: Record<string, unknown>): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Каталоги, которых в репозитории не бывает в виде исходников — сборки,
// зависимости, кеши. Сюда же не нужно смотреть на скорость и на риск
// затронуть сгенерированное (всё равно пересоберётся).
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "cache",
  ".eslintcache",
  ".next",
  "out",
]);

// Белый список расширений, а не чёрный: безопаснее явно разрешить
// текстовые форматы, где реально встречается "@boilerplate/", чем
// угадывать, что у двоичного файла не сломается от readFileSync(utf8).
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".yml",
  ".yaml",
  ".html",
]);

// pnpm-lock.yaml — не ручная правка: при другом scope в package.json
// `pnpm install` (вызывается в конце этим же скриптом, runGate) сам
// пересчитает лок-файл. Текстовая замена в нём рискует не совпасть с
// его собственным форматом целостности.
const SKIP_FILES = new Set(["pnpm-lock.yaml"]);

function findScopedTextFiles(): string[] {
  const result: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
        continue;
      }
      if (SKIP_FILES.has(entry.name)) continue;
      const dot = entry.name.lastIndexOf(".");
      if (dot === -1 || !TEXT_EXTENSIONS.has(entry.name.slice(dot))) continue;
      result.push(join(dir, entry.name));
    }
  };
  walk(ROOT);
  return result;
}

// Текущий scope берётся из packages/contract (есть всегда — ядро, не
// показательная сущность), не угадывается по строке "boilerplate":
// второй прогон с другим --scope должен находить РЕАЛЬНЫЙ текущий
// scope, а не константу "@boilerplate".
function detectCurrentScope(): string | undefined {
  const marker = join(ROOT, "packages", "contract", "package.json");
  if (!existsSync(marker)) return undefined;
  const name = readJson(marker).name;
  if (typeof name !== "string") return undefined;
  const match = /^@([^/]+)\//.exec(name);
  return match?.[1];
}

// Переименование scope трогает не только package.json: eslint.config.js,
// tsconfig.json ("extends"), prettier.config.mjs, исходники (импорты
// @boilerplate/*), README и docs/*.md (примеры кода) — любой текстовый
// файл, где scope упомянут буквальной строкой. Найдено 09.10.2026 реальным
// прогоном гейта после переименования: prettier.config.mjs импортировал
// "@boilerplate/prettier-config", которого после рескоупа уже не было —
// package.json-only поиск этого не видел.
function renameScope(newScope: string): void {
  const currentScope = detectCurrentScope();
  if (!currentScope || currentScope === newScope) {
    console.log(`[scope] уже "${newScope}" — пропущено`);
    return;
  }

  const files = findScopedTextFiles();
  let changed = 0;
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes(`@${currentScope}/`)) continue;
    writeFileSync(file, content.replaceAll(`@${currentScope}/`, `@${newScope}/`), "utf8");
    changed += 1;
  }
  console.log(`[scope] "@${currentScope}" → "@${newScope}" в ${changed} файлах`);
}

function updateRootPackageJson(name: string, description: string): void {
  const path = join(ROOT, "package.json");
  const pkg = readJson(path);
  if (pkg.name === toKebabCase(name) && pkg.description === description) {
    console.log("[package.json] имя и описание уже выставлены — пропущено");
    return;
  }
  pkg.name = toKebabCase(name);
  pkg.description = description;
  writeJson(path, pkg);
  console.log(`[package.json] name="${toKebabCase(name)}", description обновлено`);
}

function rewriteReadme(name: string, description: string): void {
  const path = join(ROOT, "README.md");
  const marker = "<!-- init-project: сброшено -->";
  if (existsSync(path) && readFileSync(path, "utf8").includes(marker)) {
    console.log("[README.md] уже переписан — пропущено");
    return;
  }
  writeFileSync(
    path,
    `${marker}\n# ${name}\n\n${description}\n\n## Запустить\n\n\`\`\`bash\ncorepack enable\npnpm install\ncp .env.example .env && cp .env.example apps/server/.env\npnpm docker:up\npnpm --filter server db:migrate\npnpm dev\n\`\`\`\n\nПеред коммитом: \`pnpm gate\`.\n\nЧто устроено как в основе, откуда этот проект создан — [docs/architecture/overview.md](docs/architecture/overview.md).\nЧто стоит выкинуть, если не нужно (мобильное, админка, второй язык, файлы, очереди) — [docs/guides/trimming.md](docs/guides/trimming.md).\n`,
    "utf8",
  );
  console.log("[README.md] переписан под новый проект");
}

// Единственная показательная сущность в этом шаблоне — Notes
// (packages/contract, apps/server, apps/web, apps/mobile, packages/i18n).
// Список файлов и правок — не общий механизм, его не на что обобщать:
// сущность одна. Проверено: удаление НЕ использует rm -rf — только
// точечные rmSync с recursive только для каталогов из этого списка.
function removeDemoEntity(): void {
  const demoDirsAndFiles = [
    "apps/server/src/notes",
    "apps/server/test/notes.e2e-spec.ts",
    "apps/server/prisma/schema/note.prisma",
    // Сеют и чистят только "Заметки" — после удаления сущности эти скрипты
    // не о чём; найдено реальным прогоном гейта на изолированной копии
    // (раздел "Фаза 12.3" задания): `prisma.note` не резолвился, `lint`
    // падал "Unsafe call of a type that could not be resolved".
    "apps/server/prisma/seed-demo.ts",
    "apps/server/prisma/seed-test.ts",
    "packages/contract/src/notes.contract.ts",
    "packages/contract/src/notes.contract.test.ts",
    "apps/web/src/routes/admin/notes.tsx",
    "packages/i18n/src/locales/ru/notes.json",
    "packages/i18n/src/locales/en/notes.json",
  ];

  const anyExists = demoDirsAndFiles.some((relative) => existsSync(join(ROOT, relative)));
  if (!anyExists) {
    console.log("[demo] заметки уже убраны — пропущено");
    return;
  }

  for (const relative of demoDirsAndFiles) {
    const path = join(ROOT, relative);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: statSync(path).isDirectory(), force: true });
  }

  patchFile(join(ROOT, "apps/server/src/app.module.ts"), (content) =>
    content
      .replace(/import \{ NotesModule \} from "\.\/notes\/notes\.module\.js";\n/, "")
      .replace(/\s*NotesModule,\n/, "\n"),
  );

  patchFile(join(ROOT, "packages/contract/src/index.ts"), (content) =>
    content
      .replace(/import \{ notesContract \} from "\.\/notes\.contract\.js";\n/, "")
      .replace(/\s*notes: notesContract,\n/, "\n")
      .replace(/export \* from "\.\/notes\.contract\.js";\n/, ""),
  );

  patchFile(join(ROOT, "packages/i18n/src/resources.ts"), (content) =>
    content
      .replace(/import enNotes from "\.\/locales\/en\/notes\.json" with \{ type: "json" \};\n/, "")
      .replace(/import ruNotes from "\.\/locales\/ru\/notes\.json" with \{ type: "json" \};\n/, "")
      .replace(/, notes: enNotes/, "")
      .replace(/, notes: ruNotes/, ""),
  );

  patchFile(join(ROOT, "apps/web/src/routes/admin/index.tsx"), (content) =>
    content.replace('to: "/admin/notes"', 'to: "/admin/system"'),
  );

  patchFile(join(ROOT, "apps/server/prisma.config.ts"), (content) =>
    content.replace(/\s*seed: "tsx prisma\/seed-demo\.ts",\n/, "\n"),
  );

  const serverPackageJsonPath = join(ROOT, "apps/server/package.json");
  if (existsSync(serverPackageJsonPath)) {
    const pkg = readJson(serverPackageJsonPath);
    const scripts = pkg.scripts as Record<string, string> | undefined;
    if (scripts && ("db:seed:demo" in scripts || "db:seed:test" in scripts)) {
      delete scripts["db:seed:demo"];
      delete scripts["db:seed:test"];
      writeJson(serverPackageJsonPath, pkg);
    }
  }

  writeHomePagePlaceholder();
  console.log("[demo] сущность «Заметки» убрана, домашние экраны заменены на заглушку");
}

function patchFile(path: string, transform: (content: string) => string): void {
  if (!existsSync(path)) return;
  const original = readFileSync(path, "utf8");
  const updated = transform(original);
  if (updated !== original) writeFileSync(path, updated, "utf8");
}

function writeHomePagePlaceholder(): void {
  const webIndex = join(ROOT, "apps/web/src/routes/index.tsx");
  if (existsSync(webIndex)) {
    writeFileSync(
      webIndex,
      `import { createFileRoute } from "@tanstack/react-router";\n\nimport { LanguageSwitcher } from "../components/language-switcher.js";\n\nexport const Route = createFileRoute("/")({\n  component: HomePage,\n});\n\nfunction HomePage() {\n  return (\n    <main className="mx-auto max-w-xl space-y-4 p-6">\n      <div className="flex items-center justify-between">\n        <h1 className="text-2xl font-semibold text-foreground">Добро пожаловать</h1>\n        <LanguageSwitcher />\n      </div>\n    </main>\n  );\n}\n`,
      "utf8",
    );
  }

  const webIndexTest = join(ROOT, "apps/web/src/routes/index.test.tsx");
  if (existsSync(webIndexTest)) rmSync(webIndexTest, { force: true });

  const mobileIndex = join(ROOT, "apps/mobile/src/app/index.tsx");
  if (existsSync(mobileIndex)) {
    writeFileSync(
      mobileIndex,
      `import { Link } from "expo-router";\nimport { Text, View } from "react-native";\n\nimport { LanguageSwitcher } from "../components/language-switcher.js";\n\nexport default function HomeScreen() {\n  return (\n    <View className="flex-1 gap-4 bg-background p-6">\n      <View className="flex flex-row items-center justify-between">\n        <Text className="text-2xl font-semibold text-foreground">Добро пожаловать</Text>\n        <LanguageSwitcher />\n      </View>\n      <Link href="/files">\n        <Text className="text-primary">{"Файлы"}</Text>\n      </Link>\n    </View>\n  );\n}\n`,
      "utf8",
    );
  }
}

function resetBacklog(): void {
  const path = join(ROOT, "docs/BACKLOG.md");
  const marker = "> **Последняя проверка:** (обновляется этим файлом)";
  if (readFileSync(path, "utf8").includes(marker)) {
    console.log("[BACKLOG.md] уже обнулён — пропущено");
    return;
  }
  writeFileSync(
    path,
    `> **Зачем читать:** остаток работ и риски, которые нужно закрыть прежде, чем\n> считать смежную работу законченной.\n> **Кому:** все, кто продолжает работу над репозиторием.\n${marker}\n\nИдентификатор: \`B-<ГГММДД>-<короткий-слаг>\`. Статусы: \`Открыто\`, \`В работе\`,\n\`Закрыто\`. Пункт в статусе «В работе» обязан иметь владельца; «Открыто» —\nне обязан.\n\n## Открыто\n\n_Пусто._\n\n## В работе\n\n_Пусто._\n\n## Закрыто\n\n_Пусто._\n`,
    "utf8",
  );
  console.log("[BACKLOG.md] обнулён");
}

// "Кроме решений о стеке" (раздел "Фаза 12" задания, пункт 12.2.1) —
// ADR-0001 оставлен, остальные (например, про удалённый кеш Turborepo)
// убраны: они специфичны для конкретной инфраструктуры этого прохода,
// не для стека как такового.
function resetDecisions(): void {
  const dir = join(ROOT, "docs/architecture/decisions");
  const keep = new Set(["ADR-0001-stack.md", "TEMPLATE.md"]);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && !keep.has(f));
  if (files.length === 0) {
    console.log("[decisions] уже только решения о стеке — пропущено");
    return;
  }
  for (const file of files) rmSync(join(dir, file), { force: true });

  // docs/README.md перечисляет каждый ADR отдельной строкой таблицы —
  // удалённый файл оставляет битую ссылку (найдено реальным прогоном
  // check:docs на изолированной копии, раздел "Фаза 12.3" задания: "битая
  // ссылка на architecture/decisions/ADR-0002-...md"). Убираем строку по
  // каждому удалённому файлу, а не только по известному сегодня имени —
  // список ADR к моменту запуска может быть другим.
  patchFile(join(ROOT, "docs/README.md"), (content) =>
    content
      .split("\n")
      .filter((line) => !files.some((file) => line.includes(`architecture/decisions/${file}`)))
      .join("\n"),
  );

  console.log(`[decisions] убрано ${files.length} ADR, оставлены решения о стеке`);
}

const FIRST_COMMIT_MESSAGE = "Начало проекта из boilerplate";

function resetGitHistory(): void {
  const gitDir = join(ROOT, ".git");
  if (!existsSync(gitDir)) {
    console.log("[git] .git уже нет — пропущено");
    return;
  }

  // Единственный шаг без проверки "уже сделано" стирал историю ПОВТОРНО
  // при каждом запуске — любой коммит, сделанный после первого запуска,
  // терялся бесследно. Найдено прогоном дважды подряд (идемпотентность,
  // раздел "Фаза 12.3" задания): остальные шаги печатают "уже … —
  // пропущено", этот — нет, просто rmSync(.git) без вопроса.
  //
  // Первая попытка фикса проверяла "ровно один коммит с этим текстом" —
  // неверно: как только сверху появляется СВОЙ коммит (обычный случай,
  // не только повторный ручной запуск), счётчик коммитов перестаёт быть
  // 1, и скрипт снова стирал всё. Правильная проверка — КОРНЕВОЙ коммит
  // истории, независимо от того, сколько коммитов сделано после него.
  try {
    const firstMessage = execSync("git log --format=%s --reverse", {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")[0]
      ?.trim();
    if (firstMessage === FIRST_COMMIT_MESSAGE) {
      console.log("[git] история уже сброшена этим скриптом — пропущено");
      return;
    }
  } catch {
    // HEAD не резолвится — репозиторий без коммитов, сбрасываем как обычно ниже.
  }

  rmSync(gitDir, { recursive: true, force: true });
  execSync("git init", { cwd: ROOT, stdio: "inherit" });
  execSync("git add -A", { cwd: ROOT, stdio: "inherit" });
  execSync(`git commit -m "${FIRST_COMMIT_MESSAGE}"`, { cwd: ROOT, stdio: "inherit" });
  console.log("[git] история сброшена, сделан первый коммит");
}

// Отдельно от runGateCheck и ДО resetGitHistory: text-правки выше (особенно
// renameScope — длина нового scope почти никогда не совпадает с "boilerplate")
// меняют длину строк внутри markdown-таблиц, а их выравнивание Prettier
// держит пробелами по самой длинной ячейке столбца. Без переформатирования
// здесь format:check упал бы уже в gate — но тогда right после "первого
// коммита" репозиторий сразу оказался бы грязным. Переформатировать нужно
// ДО коммита, не после.
function installAndFormat(): void {
  console.log("\n[install] pnpm install — может занять несколько минут...");
  execSync("pnpm install", { cwd: ROOT, stdio: "inherit" });
  console.log("\n[format] pnpm format — выравнивание таблиц и разметки после правок выше");
  execSync("pnpm format", { cwd: ROOT, stdio: "inherit" });
}

function runGateCheck(): void {
  console.log("\n[gate] pnpm gate...");
  execSync("pnpm gate", { cwd: ROOT, stdio: "inherit" });
}

function main(): void {
  const options = parseArgs();

  console.log(`init-project: "${options.name}" (scope @${options.scope})\n`);

  renameScope(options.scope);
  updateRootPackageJson(options.name, options.description);
  rewriteReadme(options.name, options.description);
  removeDemoEntity();
  resetBacklog();
  resetDecisions();

  if (options.skipGate) {
    console.log("[install/format] --skip-gate — пропущено");
  } else {
    installAndFormat();
  }

  if (options.resetGit) {
    resetGitHistory();
  } else {
    console.log("[git] --no-git-reset — история не трогается");
  }

  if (options.skipGate) {
    console.log("\n[gate] --skip-gate — пропущено");
  } else {
    runGateCheck();
  }

  console.log(
    "\nГотово. Дальше — docs/guides/trimming.md: что из заложенного (мобильное, админка, второй язык, файлы, очереди) можно выкинуть, если не нужно.",
  );
}

main();
