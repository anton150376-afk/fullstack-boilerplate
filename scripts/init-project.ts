import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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
    // Тесты и e2e-сценарии, написанные про «Заметки» или про заголовок главной страницы,
    // которую мастер заменяет заглушкой: без них гейт и Playwright нового проекта падают
    // на отсутствующих импортах и заголовках (найдено прогоном мастера, 2026-10-12).
    "apps/mobile/src/notes-screen.test.tsx",
    "apps/web/src/routes/admin/notes.test.tsx",
    "apps/web/src/routes/index.test.tsx",
    "apps/web/e2e/notes.spec.ts",
    "apps/web/e2e/language.spec.ts",
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

  // Записи `notes: enNotes` бывают и в одну строку (`, notes: enNotes`), и столбцом после
  // Prettier (`    notes: enNotes,` отдельной строкой). Прежняя правка знала только первую
  // форму и оставляла в resources.ts ссылки на удалённые переменные: гейт нового проекта
  // падал в линте i18n (найдено пробным прогоном мастера на Windows, 2026-10-12).
  patchFile(join(ROOT, "packages/i18n/src/resources.ts"), (content) =>
    content
      .replace(/import enNotes from "\.\/locales\/en\/notes\.json" with \{ type: "json" \};\n/, "")
      .replace(/import ruNotes from "\.\/locales\/ru\/notes\.json" with \{ type: "json" \};\n/, "")
      .replace(/^[ \t]*notes: (?:en|ru)Notes,?[ \t]*\n/gm, "")
      .replace(/, notes: (?:en|ru)Notes/g, ""),
  );
  assertNoMatch("packages/i18n/src/resources.ts", /(?:en|ru)Notes/);

  patchFile(join(ROOT, "apps/web/src/routes/admin/index.tsx"), (content) =>
    content.replace('to: "/admin/notes"', 'to: "/admin/system"'),
  );

  patchFile(join(ROOT, "apps/server/prisma.config.ts"), (content) =>
    content.replace(/\s*seed: "tsx prisma\/seed-demo\.ts",\n/, "\n"),
  );

  // Реестр ресурсов админки: остаётся только «Задачи».
  patchFile(join(ROOT, "apps/web/src/routes/admin.tsx"), (content) =>
    content
      .replace(/^[ \t]*const \{ t: tNotes \} = useTranslation\("notes"\);\n/m, "")
      .replace(/^[ \t]*const notesTitle = tNotes\("title"\);\n/m, "")
      .replace(
        /^[ \t]*defineResource<\{ id: string \}>\(\{\n[ \t]*name: "notes",[\s\S]*?\n[ \t]*\}\),\n/m,
        "",
      )
      .replace("[notesTitle, tasksTitle]", "[tasksTitle]"),
  );
  assertNoMatch("apps/web/src/routes/admin.tsx", /tNotes|notesTitle|name: "notes"/);

  // Интеграционные тесты хранилища: блок про NotesRepository и его подготовка.
  patchFile(join(ROOT, "apps/server/test/db.integration-spec.ts"), (content) =>
    content
      .replace(/^import \{ NotesRepository \} from "[^"]+";\n/m, "")
      .replace(/^[ \t]*let notes: NotesRepository;\n/m, "")
      .replace(/^[ \t]*notes = new NotesRepository\(service\);\n/m, "")
      .replace(/^[ \t]*await prisma\.note\.deleteMany\(\{\}\);\n/m, "")
      .replace(/\n {2}describe\("NotesRepository", \(\) => \{[\s\S]*?\n {2}\}\);\n/, ""),
  );
  assertNoMatch("apps/server/test/db.integration-spec.ts", /Notes?Repository|prisma\.note|notes\./);

  patchFile(join(ROOT, "apps/server/test/openapi.e2e-spec.ts"), (content) =>
    content.replace('toHaveProperty("/notes")', 'toHaveProperty("/tasks")'),
  );
  assertNoMatch("apps/server/test/openapi.e2e-spec.ts", /"\/notes"/);

  // Дымовой скрипт API: шаг «заметка» (вставка в базу и постановка в очередь).
  patchFile(join(ROOT, "scripts/smoke-api.sh"), (content) =>
    content.replace(/# 3\. заметка[^\n]*\n(?:[^\n]+\n)+\n/, ""),
  );
  assertNoMatch("scripts/smoke-api.sh", /\/notes/);

  // Пункт меню главной страницы назывался «Заметки»: переименовывается в «Главная».
  for (const relative of [
    "apps/web/src/routes/__root.tsx",
    "packages/i18n/src/init.test.ts",
    "packages/i18n/src/locales/en/common.json",
    "packages/i18n/src/locales/ru/common.json",
  ]) {
    patchFile(join(ROOT, relative), (content) =>
      content
        .replace(/navNotes/g, "navHome")
        .replace('"navHome": "Notes"', '"navHome": "Home",\n  "welcome": "Welcome"')
        .replace('"navHome": "Заметки"', '"navHome": "Главная",\n  "welcome": "Добро пожаловать"')
        .replace('toBe("Заметки")', 'toBe("Главная")'),
    );
    assertNoMatch(relative, /navNotes/);
  }

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

// Правка файла считается удавшейся, только если в нём не осталось следов удалённого:
// молчаливо оставленные ссылки на удалённые переменные ломали гейт нового проекта.
function assertNoMatch(relative: string, pattern: RegExp): void {
  const path = join(ROOT, relative);
  if (!existsSync(path)) return;
  if (pattern.test(readFileSync(path, "utf8"))) {
    throw new Error(
      `init-project: в ${relative} после очистки остались следы удалённого (${String(pattern)}) — ` +
        "правка не сработала на этой раскладке файла, поправьте вручную и перезапустите",
    );
  }
}

function writeHomePagePlaceholder(): void {
  const webIndex = join(ROOT, "apps/web/src/routes/index.tsx");
  if (existsSync(webIndex)) {
    writeFileSync(
      webIndex,
      [
        'import { createFileRoute } from "@tanstack/react-router";',
        'import { useTranslation } from "react-i18next";',
        "",
        'import { LanguageSwitcher } from "../components/language-switcher.js";',
        "",
        'export const Route = createFileRoute("/")({',
        "  component: HomePage,",
        "});",
        "",
        "function HomePage() {",
        "  const { t } = useTranslation();",
        "",
        "  return (",
        '    <main className="mx-auto max-w-xl space-y-4 p-6">',
        '      <div className="flex items-center justify-between">',
        '        <h1 className="text-2xl font-semibold text-foreground">{t("welcome")}</h1>',
        "        <LanguageSwitcher />",
        "      </div>",
        "    </main>",
        "  );",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const mobileIndex = join(ROOT, "apps/mobile/src/app/index.tsx");
  if (existsSync(mobileIndex)) {
    writeFileSync(
      mobileIndex,
      [
        'import { Link } from "expo-router";',
        'import { useTranslation } from "react-i18next";',
        'import { Text, View } from "react-native";',
        "",
        'import { LanguageSwitcher } from "../components/language-switcher.js";',
        "",
        "export default function HomeScreen() {",
        "  const { t } = useTranslation();",
        "",
        "  return (",
        '    <View className="flex-1 gap-4 bg-background p-6">',
        '      <View className="flex flex-row items-center justify-between">',
        '        <Text className="text-2xl font-semibold text-foreground">{t("welcome")}</Text>',
        "        <LanguageSwitcher />",
        "      </View>",
        '      <Link href="/files">',
        '        <Text className="text-primary">{t("navFiles")}</Text>',
        "      </Link>",
        "    </View>",
        "  );",
        "}",
        "",
      ].join("\n"),
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

  // Ссылки на удалённые ADR есть и в других документах (ADR-0001-stack.md, versions.md):
  // check:docs нового проекта падал на «битая ссылка на ADR-0003-...» (найдено прогоном
  // мастера, 2026-10-12). Ссылка заменяется её текстом, чтобы не терять смысл фразы.
  const escaped = files.map((file) => file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const brokenLink = new RegExp(
    `\\[([^\\]]+)\\]\\([^)\\s]*(?:${escaped.join("|")})(?:#[^)]*)?\\)`,
    "g",
  );
  for (const path of findScopedTextFiles()) {
    if (!path.endsWith(".md")) continue;
    patchFile(path, (content) => content.replace(brokenLink, "$1"));
  }

  console.log(`[decisions] убрано ${files.length} ADR, оставлены решения о стеке`);
}

const FIRST_COMMIT_MESSAGE = "Начало проекта из boilerplate";

function resetGitHistory(): void {
  const gitDir = join(ROOT, ".git");
  // Копия без .git (скачанный ZIP, архив) — не повод пропускать шаг: гейту нужен репозиторий
  // (`turbo run test --filter ...[HEAD]` падает с «not part of a Git repository»; найдено
  // прогоном мастера на копии без .git, 2026-10-12). Репозиторий создаётся с первого коммита.
  const hadGitDir = existsSync(gitDir);

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
  if (hadGitDir) {
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
  }

  if (hadGitDir) rmSync(gitDir, { recursive: true, force: true });
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
// Если зависимости уже стояли до переименования scope, в node_modules остаются связи со
// старыми именами пакетов воркспейса. На Windows pnpm не может их убрать (EPERM при
// rmdir node_modules/.pnpm/node_modules/@boilerplate), и установка падает. Поэтому устаревшие
// node_modules стираются до установки: pnpm всё равно ставит их заново, из своего хранилища.
// Надёжнее всего запускать мастер на свежей копии до pnpm install (README.md).
function removeStaleNodeModules(): void {
  const roots = ["", "apps", "packages"];
  const candidates: string[] = [];
  for (const base of roots) {
    const dir = join(ROOT, base);
    if (!existsSync(dir)) continue;
    if (base === "") {
      candidates.push(join(dir, "node_modules"));
      continue;
    }
    for (const entry of readdirSync(dir)) candidates.push(join(dir, entry, "node_modules"));
  }
  const stale = candidates.filter((path) => existsSync(path));
  if (stale.length === 0) return;
  console.log(
    `[install] удаляю устаревшие node_modules (${String(stale.length)}) перед установкой`,
  );
  for (const path of stale) {
    try {
      rmSync(path, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `[install] не удалось удалить ${path}: ${(error as Error).message}; ` +
          "если установка упадёт, запустите мастер на свежей копии без node_modules",
      );
    }
  }
}

// Файлы .env в git не попадают, а гейту они нужны уже на lint: `prisma generate` читает
// DATABASE_URL из apps/server/.env. На свежей копии их нет — создаём из .env.example тем же
// шагом, что в README ("cp .env.example .env && cp .env.example apps/server/.env").
// Существующие файлы не трогаем.
function prepareEnvFiles(): void {
  const example = join(ROOT, ".env.example");
  if (!existsSync(example)) return;
  for (const target of [".env", "apps/server/.env"]) {
    const path = join(ROOT, target);
    if (existsSync(path)) continue;
    copyFileSync(example, path);
    console.log(`[env] создан ${target} из .env.example`);
  }
}

function installAndFormat(): void {
  removeStaleNodeModules();
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
    prepareEnvFiles();
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
