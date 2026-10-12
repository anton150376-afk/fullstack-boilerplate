import { describe, expect, it } from "vitest";

import { maskSecrets } from "./masking.js";

// Явный тест критерия приёмки Фазы 9: "Authorization, токены и пароли
// в отчёт не попадают" — не полагается на то, что форма данных сама их
// не содержит (это первая линия защиты, см. комментарий в masking.ts),
// проверяет именно функцию маскирования.
describe("maskSecrets", () => {
  it("маскирует значения по именам ключей authorization/token/password/secret/api-key/cookie", () => {
    const input = {
      Authorization: "Bearer abc123",
      token: "xyz",
      password: "qwerty",
      secret: "s3cr3t",
      apiKey: "key-1",
      "api-key": "key-2",
      cookie: "session=1",
      title: "обычное поле",
    };

    const result = maskSecrets(input) as Record<string, unknown>;

    expect(result.Authorization).toBe("[masked]");
    expect(result.token).toBe("[masked]");
    expect(result.password).toBe("[masked]");
    expect(result.secret).toBe("[masked]");
    expect(result.apiKey).toBe("[masked]");
    expect(result["api-key"]).toBe("[masked]");
    expect(result.cookie).toBe("[masked]");
    expect(result.title).toBe("обычное поле");
  });

  it("маскирует 'Bearer <токен>' внутри произвольного текста (сообщение лога)", () => {
    const message = "fetch failed: header Authorization: Bearer abc.def-123 was rejected";

    expect(maskSecrets(message)).toBe(
      "fetch failed: header Authorization: Bearer [masked] was rejected",
    );
  });

  it("обходит вложенные объекты и массивы рекурсивно", () => {
    const input = {
      request: { headers: { Authorization: "Bearer abc" } },
      items: [{ password: "x" }, { title: "ок" }],
    };

    const result = maskSecrets(input) as {
      request: { headers: { Authorization: string } };
      items: [{ password: string }, { title: string }];
    };

    expect(result.request.headers.Authorization).toBe("[masked]");
    expect(result.items[0].password).toBe("[masked]");
    expect(result.items[1].title).toBe("ок");
  });

  it("не падает и не зацикливается на циклической ссылке", () => {
    const input: Record<string, unknown> = { title: "x" };
    input.self = input;

    expect(() => maskSecrets(input)).not.toThrow();
  });

  it("не трогает числа/булевы/null/undefined", () => {
    expect(maskSecrets(42)).toBe(42);
    expect(maskSecrets(true)).toBe(true);
    expect(maskSecrets(null)).toBe(null);
    expect(maskSecrets(undefined)).toBe(undefined);
  });
});
