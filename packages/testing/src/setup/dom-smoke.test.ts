// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import "./dom.js";

describe("пресет domPreset (через jest-dom/vitest)", () => {
  it("даёт настоящий DOM через jsdom", () => {
    expect(typeof document).toBe("object");
    expect(document.body).not.toBeNull();
  });

  it("регистрирует матчеры jest-dom (toBeInTheDocument)", () => {
    const el = document.createElement("p");
    el.textContent = "привет";
    document.body.append(el);

    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("привет");
  });
});
