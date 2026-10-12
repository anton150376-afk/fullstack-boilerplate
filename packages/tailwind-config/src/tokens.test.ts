import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractColors, renderTokensModule } from "../scripts/generate-tokens.js";

const HERE = dirname(fileURLToPath(import.meta.url));

describe("hex-зеркало палитры", () => {
  it("совпадает с тем, что породил бы generate-tokens.ts из текущего theme.css", () => {
    const themeCss = readFileSync(resolve(HERE, "theme.css"), "utf8");
    const committedTokens = readFileSync(resolve(HERE, "tokens.ts"), "utf8");

    const freshlyGenerated = renderTokensModule(extractColors(themeCss));

    expect(committedTokens).toBe(freshlyGenerated);
  });

  it("покрывает все шесть семейств по одиннадцать ступеней", () => {
    const themeCss = readFileSync(resolve(HERE, "theme.css"), "utf8");
    const colors = extractColors(themeCss);

    const families = new Set(colors.map((c) => c.family));
    expect(families).toEqual(
      new Set(["brand", "accent", "neutral", "success", "warning", "danger"]),
    );
    expect(colors).toHaveLength(66);
  });
});
