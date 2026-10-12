import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import ts from "typescript";

// Проверки локализации (docs/guides/i18n.md):
//  1. Каталоги ru/en: совпадение ключей, обязательные _few/_many у каждого
//     _one в русском каталоге, ключи отсортированы (построчные конфликты
//     слияния, раздел 7.5 задания). Исправить порядок: --fix-order.
//  2. Использование ключей: вызов t("ключ") с ключом, которого нет в
//     каталоге, и ключ каталога, который нигде не вызывается.
//  3. Вшитые кириллические строки в JSX и в обычном коде приложений и
//     компонентных пакетов. «Храповик»: существующие зафиксированы по
//     файлам в scripts/i18n-hardcoded-baseline.json, новые роняют гейт.
//     Пометка i18n-ignore на той же или предыдущей строке разрешает строку.

const ROOT = process.cwd();
const I18N_DIR = join(ROOT, "packages", "i18n", "src", "locales");
const PLURAL_SUFFIXES = ["_one", "_few", "_many", "_other"] as const;
const SCAN_DIRS = [
  "apps/web/src",
  "apps/mobile/src",
  "packages/ui-web/src",
  "packages/ui-native/src",
  "packages/admin-kit/src",
  "packages/ui-core/src",
];
// Вызовы t() ищутся и в пакете i18n: там лежат функции сборки подписей.
const KEY_USAGE_DIRS = [...SCAN_DIRS, "packages/i18n/src"];
// Русские значения по умолчанию библиотечных компонентов: текст в этих
// файлах задуман вшитым, приложения переопределяют его пропсом labels.
const DEFAULT_LABEL_FILES = new Set([
  "packages/admin-kit/src/labels.ts",
  "packages/ui-core/src/labels.ts",
]);
const BASELINE_PATH = join(ROOT, "scripts", "i18n-hardcoded-baseline.json");
const CYRILLIC = /[Ѐ-ӿ]/;
// t, tAdmin, tUi: так называют функцию перевода; i18n.t(...) ловится по имени свойства.
const TRANSLATE_CALLEE = /^t([A-Z]\w*)?$/;

interface Hit {
  file: string;
  line: number;
  text: string;
}

interface KeyUsage {
  key: string;
  at: string;
}

interface SourceFile {
  file: string;
  isTest: boolean;
  text: string;
  source: ts.SourceFile;
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stripPlural(key: string): string {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return key;
}

function listSourceFiles(dir: string): string[] {
  const absolute = join(ROOT, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .filter((entry) => !entry.name.endsWith(".d.ts") && entry.name !== "routeTree.gen.ts")
    .map((entry) => join(entry.parentPath, entry.name));
}

function parseSource(absolutePath: string): SourceFile {
  const text = readFileSync(absolutePath, "utf8");
  const file = relative(ROOT, absolutePath).split(sep).join("/");
  const source = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return { file, isTest: /\.test\.tsx?$/.test(file), text, source };
}

// Считает кириллический текст между тегами JSX и любые строковые литералы
// с кириллицей в коде. Комментарии, тесты и файлы значений по умолчанию
// в счёт не идут.
function findHardcodedStrings({ file, isTest, text, source }: SourceFile): Hit[] {
  if (isTest || DEFAULT_LABEL_FILES.has(file)) return [];

  const hits: Hit[] = [];
  const lines = text.split("\n");

  // position — смещение первой кириллической буквы: у многострочного JsxText
  // начало узла стоит в конце предыдущего элемента, а не на строке с текстом.
  const add = (position: number, value: string) => {
    const { line } = source.getLineAndCharacterOfPosition(position);
    const marked = [lines[line], lines[line - 1]].some((l) => l?.includes("i18n-ignore"));
    if (marked) return;
    hits.push({ file, line: line + 1, text: value.trim().replace(/\s+/g, " ").slice(0, 60) });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && CYRILLIC.test(node.text)) {
      add(node.pos + node.text.search(CYRILLIC), node.text);
    } else if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      CYRILLIC.test(node.text)
    ) {
      add(node.getStart(source), node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return hits;
}

// Статические ключи вызовов t("ключ") и расположение динамических вызовов.
function findKeyUsages({ file, source }: SourceFile): { keys: KeyUsage[]; dynamic: string[] } {
  const keys: KeyUsage[] = [];
  const dynamic: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : "";
      const first = node.arguments[0];
      if (first && TRANSLATE_CALLEE.test(name)) {
        const at = `${file}:${source.getLineAndCharacterOfPosition(first.getStart(source)).line + 1}`;
        if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
          keys.push({ key: first.text, at });
        } else {
          dynamic.push(at);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return { keys, dynamic };
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function sortKeysDeep(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => compareKeys(a, b))
        .map(([key, inner]) => [key, sortKeysDeep(inner)]),
    );
  }
  return value;
}

function findUnsortedPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys = Object.keys(obj);
  const paths = keys.every((key, i) => i === 0 || compareKeys(keys[i - 1] ?? "", key) <= 0)
    ? []
    : [prefix || "(корень файла)"];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(
        ...findUnsortedPaths(value as Record<string, unknown>, prefix ? `${prefix}.${key}` : key),
      );
    }
  }
  return paths;
}

function readCatalog(lang: string, file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(I18N_DIR, lang, file), "utf8")) as Record<string, unknown>;
}

function catalogFiles(lang: string): string[] {
  return readdirSync(join(I18N_DIR, lang)).filter((f) => f.endsWith(".json"));
}

function fixOrder(languages: string[]): void {
  let changed = 0;
  for (const lang of languages) {
    for (const file of catalogFiles(lang)) {
      const before = readFileSync(join(I18N_DIR, lang, file), "utf8");
      const after = `${JSON.stringify(sortKeysDeep(readCatalog(lang, file)), null, 2)}\n`;
      if (after !== before) {
        writeFileSync(join(I18N_DIR, lang, file), after, "utf8");
        changed += 1;
      }
    }
  }
  console.log(`check:i18n — порядок ключей исправлен в файлах: ${changed}`);
}

function checkKeyOrder(languages: string[], errors: string[]): void {
  for (const lang of languages) {
    for (const file of catalogFiles(lang)) {
      for (const path of findUnsortedPaths(readCatalog(lang, file))) {
        errors.push(
          `${lang}/${file}: ключи не по алфавиту в ${path} — pnpm exec tsx scripts/check-i18n.ts --fix-order`,
        );
      }
    }
  }
}

function checkKeyUsage(errors: string[], notes: string[]): void {
  const ruFiles = catalogFiles("ru");
  const catalog = new Map<string, Set<string>>();
  for (const file of ruFiles) {
    catalog.set(file.replace(/\.json$/, ""), new Set(flattenKeys(readCatalog("ru", file))));
  }

  const hasKey = (ns: string | undefined, path: string): boolean =>
    [...catalog.entries()].some(
      ([name, keys]) =>
        (ns === undefined || ns === name) &&
        (keys.has(path) || PLURAL_SUFFIXES.some((suffix) => keys.has(`${path}${suffix}`))),
    );

  const usedPaths = new Set<string>();
  const usedQualified = new Set<string>();
  const dynamic: string[] = [];

  for (const dir of KEY_USAGE_DIRS) {
    for (const path of listSourceFiles(dir)) {
      const info = parseSource(path);
      const usage = findKeyUsages(info);
      for (const { key, at } of usage.keys) {
        const separator = key.indexOf(":");
        const ns = separator === -1 ? undefined : key.slice(0, separator);
        const keyPath = separator === -1 ? key : key.slice(separator + 1);
        if (!hasKey(ns, keyPath)) {
          errors.push(`${at}: ключ «${key}» не найден в русском каталоге`);
        }
        if (!info.isTest) {
          usedPaths.add(stripPlural(keyPath));
          if (ns) usedQualified.add(`${ns}:${stripPlural(keyPath)}`);
        }
      }
      if (!info.isTest) dynamic.push(...usage.dynamic);
    }
  }

  if (dynamic.length > 0) {
    notes.push(`неиспользуемые ключи не проверены: динамические ключи t() в ${dynamic.join(", ")}`);
    return;
  }

  // Пространство имён учитывается только у вызовов вида t("ns:ключ"); вызов
  // t("ключ") засчитывается ключу с таким путём в любом пространстве.
  for (const [ns, keys] of catalog) {
    for (const key of keys) {
      const base = stripPlural(key);
      if (!usedPaths.has(base) && !usedQualified.has(`${ns}:${base}`)) {
        errors.push(`ru: ключ ${ns}:${key} нигде не используется — удалите или подключите`);
      }
    }
  }
}

function checkHardcodedStrings(errors: string[], notes: string[]): void {
  const hitsByFile = new Map<string, Hit[]>();
  for (const dir of SCAN_DIRS) {
    for (const path of listSourceFiles(dir)) {
      const hits = findHardcodedStrings(parseSource(path));
      const file = hits[0]?.file;
      if (file) hitsByFile.set(file, hits);
    }
  }

  if (process.argv.includes("--update-baseline")) {
    const sorted = [...hitsByFile.entries()].sort(([a], [b]) => compareKeys(a, b));
    const baseline = Object.fromEntries(sorted.map(([file, hits]) => [file, hits.length]));
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    console.log(`check:i18n — baseline обновлён: ${sorted.length} файлов`);
    return;
  }

  const baseline: Record<string, number> = existsSync(BASELINE_PATH)
    ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, number>)
    : {};

  for (const [file, hits] of hitsByFile) {
    const allowed = baseline[file] ?? 0;
    if (hits.length > allowed) {
      const shown = hits.map((hit) => `${hit.file}:${hit.line} «${hit.text}»`).join("; ");
      errors.push(
        `${file}: вшитых кириллических строк ${hits.length}, в baseline ${allowed} — вынесите новые в packages/i18n (${shown})`,
      );
    }
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const current = hitsByFile.get(file)?.length ?? 0;
    if (current < allowed) {
      notes.push(
        `${file}: вшитых строк стало ${current} вместо ${allowed} — обновите baseline: pnpm exec tsx scripts/check-i18n.ts --update-baseline`,
      );
    }
  }
}

function main(): void {
  if (!existsSync(I18N_DIR)) {
    console.log("check:i18n — пропущено: packages/i18n/src/locales ещё не создан (Фаза 2)");
    return;
  }

  const languages = readdirSync(I18N_DIR).filter((name) => existsSync(join(I18N_DIR, name)));
  const errors: string[] = [];
  const notes: string[] = [];

  if (process.argv.includes("--fix-order")) {
    fixOrder(languages);
    return;
  }
  if (process.argv.includes("--update-baseline")) {
    checkHardcodedStrings(errors, notes);
    return;
  }

  const keysByLanguage = new Map<string, Set<string>>();

  for (const lang of languages) {
    const keys = new Set<string>();
    for (const file of catalogFiles(lang)) {
      for (const key of flattenKeys(readCatalog(lang, file))) keys.add(`${file}:${key}`);
    }
    keysByLanguage.set(lang, keys);
  }

  const ru = keysByLanguage.get("ru");
  if (ru) {
    for (const key of ru) {
      if (key.endsWith("_one")) {
        const stem = key.slice(0, -"_one".length);
        for (const suffix of ["_few", "_many"] as const) {
          if (!ru.has(`${stem}${suffix}`)) {
            errors.push(`ru: у ключа ${key} нет пары ${stem}${suffix}`);
          }
        }
      }
    }
  }

  const [base, ...restLanguages] = [...keysByLanguage.keys()];
  if (base && restLanguages.length > 0) {
    const baseKeys = new Set([...(keysByLanguage.get(base) ?? [])].map(stripPlural));
    for (const lang of restLanguages) {
      const otherKeys = new Set([...(keysByLanguage.get(lang) ?? [])].map(stripPlural));
      for (const key of baseKeys) {
        if (!otherKeys.has(key)) errors.push(`${lang}: не хватает ключа ${key} (есть в ${base})`);
      }
      for (const key of otherKeys) {
        if (!baseKeys.has(key)) errors.push(`${base}: не хватает ключа ${key} (есть в ${lang})`);
      }
    }
  }

  checkKeyOrder(languages, errors);
  checkKeyUsage(errors, notes);
  checkHardcodedStrings(errors, notes);

  for (const note of notes) console.log(`check:i18n — заметка: ${note}`);

  if (errors.length > 0) {
    console.error("check:i18n — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`check:i18n — ok (языки: ${languages.join(", ") || "нет"})`);
}

main();
