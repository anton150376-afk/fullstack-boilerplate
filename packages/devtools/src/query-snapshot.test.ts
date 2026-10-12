import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";

import { snapshotQueryCache } from "./query-snapshot.js";

describe("snapshotQueryCache", () => {
  it("отражает успешный запрос без данных запроса в снимке", async () => {
    const queryClient = new QueryClient();

    await queryClient.query({
      queryKey: ["notes", 1],
      queryFn: () => Promise.resolve({ secret: "не должно попасть в снимок" }),
    });

    const [entry] = snapshotQueryCache(queryClient);

    expect(entry).toBeDefined();
    expect(entry).toMatchObject({ status: "success", isError: false });
    expect(entry?.dataUpdatedAt).toBeGreaterThan(0);
    expect(entry).not.toHaveProperty("data");
    expect(JSON.stringify(entry)).not.toContain("секрет");
  });

  it("отражает ошибку запроса как isError: true", async () => {
    const queryClient = new QueryClient();

    await queryClient
      .query({
        queryKey: ["notes", 2],
        queryFn: () => Promise.reject(new Error("boom")),
      })
      .catch(() => undefined);

    const [entry] = snapshotQueryCache(queryClient);

    expect(entry).toMatchObject({ status: "error", isError: true });
  });
});
