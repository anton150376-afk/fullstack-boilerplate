import { describe, expect, it } from "vitest";

import { defaultFileUploadLabels, resolveLabels } from "./labels.js";

describe("resolveLabels", () => {
  it("накладывает переданные подписи на значения по умолчанию", () => {
    const labels = resolveLabels(defaultFileUploadLabels, { progress: "Progress" });

    expect(labels.progress).toBe("Progress");
    expect(labels.confirming).toBe(defaultFileUploadLabels.confirming);
  });

  it("без переопределений возвращает значения по умолчанию", () => {
    expect(resolveLabels(defaultFileUploadLabels)).toEqual(defaultFileUploadLabels);
  });

  it("подпись-функция получает код ответа хранилища", () => {
    expect(defaultFileUploadLabels.rejectedWithCode(502)).toContain("502");
  });
});
