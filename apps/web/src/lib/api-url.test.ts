import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./api-url.js";

describe("resolveApiBaseUrl", () => {
  const publicUrl = "http://localhost:3000";
  const internalUrl = "http://server:3000";

  it("на сервере берёт внутренний адрес, если он задан", () => {
    expect(resolveApiBaseUrl({ isServer: true, internalUrl, publicUrl })).toBe(internalUrl);
  });

  it("на сервере без внутреннего адреса берёт публичный", () => {
    expect(resolveApiBaseUrl({ isServer: true, internalUrl: undefined, publicUrl })).toBe(
      publicUrl,
    );
  });

  it("пустая строка во внутреннем адресе считается незаданной", () => {
    expect(resolveApiBaseUrl({ isServer: true, internalUrl: "", publicUrl })).toBe(publicUrl);
  });

  it("в браузере всегда публичный адрес, внутренний не используется", () => {
    expect(resolveApiBaseUrl({ isServer: false, internalUrl, publicUrl })).toBe(publicUrl);
  });
});
