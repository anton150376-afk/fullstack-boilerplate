import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Полная логика раздела 3.4 и 7.6 задания: формат идентификатора
// `B-<ГГММДД>-<слаг>`, уникальность, обязательный критерий закрытия у любого
// пункта, обязательный владелец у пунктов «В работе». Сверка корректности
// ссылок (пункт раздела 3.11) добавляется, когда в бэклоге появятся ссылки
// на файлы, которых сейчас в пустом каркасе ещё нет.

const BACKLOG_PATH = resolve(process.cwd(), "docs/BACKLOG.md");
const ID_PATTERN = /^B-\d{6}-[a-z0-9-]+$/;
const EMPTY = new Set(["", "-", "—", "_пусто._", "_пусто_"]);

interface Row {
  id: string;
  owner: string;
  closure: string;
  section: string;
}

function parseSections(markdown: string): Row[] {
  const lines = markdown.split(/\r?\n/);
  const rows: Row[] = [];
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
    if (cells.length < 7) continue;
    const id = cells[0] ?? "";
    if (id === "ID" || /^-+$/.test(id)) continue;

    rows.push({
      id,
      owner: cells[4] ?? "",
      closure: cells[6] ?? "",
      section,
    });
  }

  return rows;
}

function main(): void {
  const markdown = readFileSync(BACKLOG_PATH, "utf8");
  const rows = parseSections(markdown);
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const row of rows) {
    if (!ID_PATTERN.test(row.id)) {
      errors.push(`${row.id || "(без ID)"}: не соответствует формату B-ГГММДД-слаг`);
      continue;
    }

    const existing = seen.get(row.id);
    if (existing) {
      errors.push(
        `${row.id}: идентификатор не уникален (разделы «${existing}» и «${row.section}»)`,
      );
    }
    seen.set(row.id, row.section);

    if (EMPTY.has(row.closure.toLowerCase())) {
      errors.push(`${row.id}: нет критерия закрытия`);
    }

    if (row.section === "В работе" && EMPTY.has(row.owner.toLowerCase())) {
      errors.push(`${row.id}: статус «В работе» без владельца`);
    }
  }

  if (errors.length > 0) {
    console.error("check:backlog — нарушения:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`check:backlog — ok (${rows.length} пунктов)`);
}

main();
