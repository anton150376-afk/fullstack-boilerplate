import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// Файлы типов, которые Expo и Uniwind обычно создают при первом запуске
// Metro (`expo start`, `expo export`). Они в .gitignore, поэтому на свежем
// клоне их нет, и без них типизированные линт и tsc видят `any` вместо типов
// process.env.EXPO_PUBLIC_* и className. Скрипт создаёт их без запуска Metro;
// turbo запускает его перед lint и typecheck (turbo.json, задача generate:types).

// Содержимое expo-env.d.ts то же, что пишет сам Expo.
writeFileSync(
  "expo-env.d.ts",
  [
    '/// <reference types="expo/types" />',
    "",
    "// NOTE: This file should not be edited and should be in your git ignore",
    "",
  ].join("\n"),
);

execFileSync(
  "uniwind",
  ["generate-artifacts", "--css", "./src/global.css", "--dts", "./uniwind-env.d.ts"],
  { stdio: "inherit", shell: true },
);
