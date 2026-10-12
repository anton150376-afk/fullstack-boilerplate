import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { formatHex } from "culori";

// Порождает src/tokens.ts из src/theme.css: hex-зеркало палитры для
// потребителей, которые не понимают oklch() — react-native-svg, сырые
// стили RN, генераторы иконок (раздел "Грабли", пункт 8 задания).
// Источник правды — theme.css; этот файл только читает его и конвертирует.

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME_CSS_PATH = resolve(HERE, "../src/theme.css");
const TOKENS_TS_PATH = resolve(HERE, "../src/tokens.ts");

const COLOR_VAR_PATTERN = /--color-([a-z]+)-(\d+):\s*(oklch\([^)]+\));/g;

export interface ExtractedColor {
  family: string;
  step: string;
  oklch: string;
  hex: string;
}

export function extractColors(themeCss: string): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  let match: RegExpExecArray | null;
  while ((match = COLOR_VAR_PATTERN.exec(themeCss))) {
    const [, family, step, oklch] = match;
    if (!family || !step || !oklch) continue;
    const hex = formatHex(oklch);
    if (!hex) {
      throw new Error(`Не удалось сконвертировать ${oklch} (--color-${family}-${step}) в hex`);
    }
    colors.push({ family, step, oklch, hex });
  }
  return colors;
}

export function renderTokensModule(colors: ExtractedColor[]): string {
  const families = new Map<string, Record<string, string>>();
  for (const { family, step, hex } of colors) {
    const scale = families.get(family) ?? {};
    scale[step] = hex;
    families.set(family, scale);
  }

  const familyEntries = [...families.entries()]
    .map(([family, scale]) => {
      const steps = Object.entries(scale)
        .map(([step, hex]) => `    "${step}": "${hex}",`)
        .join("\n");
      return `  ${family}: {\n${steps}\n  },`;
    })
    .join("\n");

  return `// Файл порождён \`pnpm --filter @boilerplate/tailwind-config generate:tokens\`
// из src/theme.css. Не редактировать руками — правки теряются при
// следующей генерации. См. docs/packages/tailwind-config.md.

export const colorTokens = {
${familyEntries}
} as const;

export type ColorFamily = keyof typeof colorTokens;
export type ColorStep = keyof (typeof colorTokens)[ColorFamily];
`;
}

function main(): void {
  const themeCss = readFileSync(THEME_CSS_PATH, "utf8");
  const colors = extractColors(themeCss);
  if (colors.length === 0) {
    throw new Error(`В ${THEME_CSS_PATH} не нашлось ни одной переменной --color-*`);
  }
  writeFileSync(TOKENS_TS_PATH, renderTokensModule(colors), "utf8");
  console.log(
    `tokens.ts обновлён: ${colors.length} цветов из ${new Set(colors.map((c) => c.family)).size} семейств`,
  );
}

// Запускать генерацию только при прямом вызове скрипта (`tsx
// scripts/generate-tokens.ts`), а не при импорте `extractColors`/
// `renderTokensModule` из теста — иначе тест на сравнение с коммитом
// сначала молча перезаписывает файл, который должен был проверять.
const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main();
}
