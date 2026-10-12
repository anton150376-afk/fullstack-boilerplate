import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Общая с check-backlog.ts логика парсинга таблиц бэклога, выделена сюда,
// чтобы done-gate.sh мог спросить одним вызовом: "существует ли пункт
// <id> со статусом Открыто/В работе?" — без дублирования парсера в bash.

const BACKLOG_PATH = resolve(process.cwd(), "docs/BACKLOG.md");
const ALLOWED_SECTIONS = new Set(["Открыто", "В работе"]);

function main(): void {
  const id = process.argv[2];
  if (!id) {
    console.error("Использование: tsx scripts/gate-allow-check.ts <B-ID>");
    process.exit(1);
  }

  const markdown = readFileSync(BACKLOG_PATH, "utf8");
  const lines = markdown.split(/\r?\n/);
  let section = "";

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      section = (heading[1] ?? "").trim();
      continue;
    }
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const rowId = cells[0] ?? "";
    if (rowId !== id) continue;

    if (ALLOWED_SECTIONS.has(section)) {
      process.exit(0);
    }
    console.error(`${id}: найден в разделе «${section}», а не «Открыто»/«В работе»`);
    process.exit(1);
  }

  console.error(`${id}: не найден в docs/BACKLOG.md`);
  process.exit(1);
}

main();
