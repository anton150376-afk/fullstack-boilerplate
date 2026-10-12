#!/usr/bin/env node
// Хук PostToolUse на Write/Edit: форматирует ровно тот файл, который
// только что тронул агент. Побочный эффект, не критичный шаг — любая
// ошибка здесь гасится, а не роняет инструмент агента.
import { execFileSync } from "node:child_process";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(input);
    const filePath = payload?.tool_input?.file_path;
    if (typeof filePath === "string" && filePath.length > 0) {
      execFileSync("npx", ["prettier", "--write", "--ignore-unknown", filePath], {
        stdio: "ignore",
      });
    }
  } catch {
    // форматирование не удалось — не блокируем агента из-за этого
  }
  process.exit(0);
});
