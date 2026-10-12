import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Полная проверка раздела 3.11 задания: README.md у каждого apps/*
// и packages/*, страница в docs/packages|apps и упоминание в
// docs/README.md, вводный блок, запрещённые обороты, битые ссылки,
// эмодзи в заголовках.

const ROOT = process.cwd();
const ALLOW_COMMENT = /<!--\s*docs-check:\s*allow\s+.+-->/;
// [^.,;\n]{1,60} — в пределах одной строки и одного предложения:
// без этого ограничения класс символов незаметно пропускает перевод
// строки, и совпадение утекает на сотни символов вперёд, до первого "а"
// в соседнем, никак не связанном предложении (обнаружено намеренной
// проверкой гейта на собственном docs/BACKLOG.md).
const CONTRASTIVE_PATTERNS = [
  /это\s+не\s+[^.,;\n]{1,60},?\s*а\s+/giu,
  /не\s+просто\s+[^.,;\n]{1,60},?\s*а\s+/giu,
];

function listWorkspaceDirs(group: "apps" | "packages"): string[] {
  const base = join(ROOT, group);
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((name) => statSync(join(base, name)).isDirectory());
}

function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function relativePath(file: string): string {
  return file
    .replace(ROOT + "\\", "")
    .replace(ROOT + "/", "")
    .replace(/\\/g, "/");
}

function checkReadmes(errors: string[]): void {
  for (const group of ["apps", "packages"] as const) {
    for (const name of listWorkspaceDirs(group)) {
      const readme = join(ROOT, group, name, "README.md");
      if (!existsSync(readme)) {
        errors.push(`${group}/${name}: нет README.md`);
      }
    }
  }
}

function checkDocsPages(errors: string[]): void {
  const docsReadme = existsSync(join(ROOT, "docs", "README.md"))
    ? readFileSync(join(ROOT, "docs", "README.md"), "utf8")
    : "";

  for (const group of ["apps", "packages"] as const) {
    const docsGroupDir = group === "apps" ? "apps" : "packages";
    for (const name of listWorkspaceDirs(group)) {
      const pagePath = join(ROOT, "docs", docsGroupDir, `${name}.md`);
      if (!existsSync(pagePath)) {
        errors.push(`${group}/${name}: нет страницы docs/${docsGroupDir}/${name}.md`);
        continue;
      }
      const pageLink = `${docsGroupDir}/${name}.md`;
      if (!docsReadme.includes(pageLink) && !docsReadme.includes(`${name}.md`)) {
        errors.push(`docs/README.md: не упоминает docs/${pageLink}`);
      }
    }
  }
}

function checkRelativeLinks(docsFiles: string[], errors: string[]): void {
  const linkPattern = /\]\(([^)]+)\)/g;

  for (const file of docsFiles) {
    const content = readFileSync(file, "utf8");
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content))) {
      const target = ((match[1] ?? "").split("#")[0] ?? "").trim();
      if (target === "" || /^[a-z]+:\/\//i.test(target) || target.startsWith("mailto:")) {
        continue;
      }
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved)) {
        errors.push(`${relativePath(file)}: битая ссылка на ${target}`);
      }
    }
  }
}

function checkIntroBlock(docsFiles: string[], errors: string[]): void {
  for (const file of docsFiles) {
    const path = relativePath(file);
    // ADR и бэклог — не страницы-гайды, у них свой формат заголовка
    // (раздел 3 задания: шаблон ADR — "Статус"/"Дата", не "Зачем читать").
    if (path === "docs/BACKLOG.md" || path.startsWith("docs/architecture/decisions/")) continue;
    const content = readFileSync(file, "utf8");
    const hasBlock =
      content.includes("**Зачем читать:**") &&
      content.includes("**Кому:**") &&
      content.includes("**Последняя проверка:**");
    if (!hasBlock) {
      errors.push(
        `${relativePath(file)}: нет вводного блока «Зачем читать / Кому / Последняя проверка»`,
      );
    }
  }
}

function checkForbiddenPhrases(docsFiles: string[], errors: string[]): void {
  const forbiddenPath = join(ROOT, "scripts", "docs-forbidden.json");
  const forbidden: string[] = existsSync(forbiddenPath)
    ? (JSON.parse(readFileSync(forbiddenPath, "utf8")) as string[])
    : [];

  for (const file of docsFiles) {
    const content = readFileSync(file, "utf8");
    if (ALLOW_COMMENT.test(content)) continue;

    const lower = content.toLowerCase();
    for (const phrase of forbidden) {
      if (lower.includes(phrase.toLowerCase())) {
        errors.push(`${relativePath(file)}: запрещённый оборот «${phrase}»`);
      }
    }

    for (const pattern of CONTRASTIVE_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`${relativePath(file)}: противопоставление-пустышка вида «это не X, а Y»`);
      }
    }

    const headingEmoji = /^#{1,6}\s.*\p{Extended_Pictographic}/gmu;
    if (headingEmoji.test(content)) {
      errors.push(`${relativePath(file)}: эмодзи в заголовке`);
    }
  }
}

function main(): void {
  const errors: string[] = [];
  const docsFiles = findMarkdownFiles(join(ROOT, "docs"));

  if (!existsSync(join(ROOT, "docs", "README.md"))) {
    errors.push("docs/README.md отсутствует");
  }

  checkReadmes(errors);
  checkDocsPages(errors);
  checkRelativeLinks(docsFiles, errors);
  checkIntroBlock(docsFiles, errors);
  checkForbiddenPhrases(docsFiles, errors);

  if (errors.length > 0) {
    console.error("check:docs — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`check:docs — ok (${docsFiles.length} страниц)`);
}

main();
