import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Настоящая сверка состава экспортов ui-web/ui-native (раздел "Фаза 8"
// задания — довести до этого обещала Фаза 7, см. docs/packages/ui.md).
// packages/admin-kit — веб-только часть, в сравнение не входит вообще:
// сверяются только эти два пакета, у admin-kit нет мобильной пары и
// никогда не будет (раздел "Фаза 8" задания, пункт 8.7).

const ROOT = process.cwd();
const WEB = join(ROOT, "packages", "ui-web");
const NATIVE = join(ROOT, "packages", "ui-native");
const EXCEPTIONS_PATH = join(ROOT, "docs", "packages", "ui-parity-exceptions.json");

// Берёт только ИМЕНА экспортов из "export { A, type B, C } from ...": то,
// что видит потребитель импортом, не парсит TS в общем виде — так же
// просто, как остальные check-*.ts в этом репозитории.
function extractExportNames(filePath: string): Set<string> {
  const content = readFileSync(filePath, "utf8");
  const names = new Set<string>();
  const exportBlockPattern = /export\s*\{([^}]+)\}/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = exportBlockPattern.exec(content))) {
    const block = blockMatch[1] ?? "";
    for (const rawEntry of block.split(",")) {
      const entry = rawEntry.trim().replace(/^type\s+/, "");
      if (!entry) continue;
      const name = entry.split(/\s+as\s+/).pop();
      if (name) names.add(name.trim());
    }
  }
  return names;
}

function main(): void {
  if (!existsSync(WEB) || !existsSync(NATIVE)) {
    console.log(
      "check:parity — пропущено: packages/ui-web и/или packages/ui-native ещё не созданы (Фаза 7)",
    );
    return;
  }

  const exceptions: Record<string, string> = existsSync(EXCEPTIONS_PATH)
    ? (JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")) as Record<string, string>)
    : {};
  const exceptionNames = new Set(Object.keys(exceptions));

  const webExports = extractExportNames(join(WEB, "src", "index.ts"));
  const nativeExports = extractExportNames(join(NATIVE, "src", "index.ts"));

  const errors: string[] = [];
  for (const name of webExports) {
    if (!nativeExports.has(name) && !exceptionNames.has(name)) {
      errors.push(`"${name}" экспортируется из ui-web, но не из ui-native — нет в исключениях`);
    }
  }
  for (const name of nativeExports) {
    if (!webExports.has(name) && !exceptionNames.has(name)) {
      errors.push(`"${name}" экспортируется из ui-native, но не из ui-web — нет в исключениях`);
    }
  }

  if (errors.length > 0) {
    console.error("check:parity — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `check:parity — ok (${webExports.size} экспортов ui-web, ${nativeExports.size} ui-native, исключений: ${exceptionNames.size})`,
  );
}

main();
