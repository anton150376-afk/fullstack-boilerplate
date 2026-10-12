import { describe, expect, it } from "vitest";

import { buttonTextVariants, buttonVariants } from "./button-variants.js";

describe("buttonVariants", () => {
  it("по умолчанию отдаёт primary/md", () => {
    const classes = buttonVariants();
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("h-10");
  });

  it("variant и size дают разные классы", () => {
    const outline = buttonVariants({ variant: "outline", size: "sm" });
    const secondary = buttonVariants({ variant: "secondary", size: "sm" });

    expect(outline).not.toBe(secondary);
    expect(outline).toContain("border");
    expect(secondary).toContain("bg-secondary");
  });
});

describe("buttonTextVariants", () => {
  it("даёт цвет текста, парный фону варианта (для native, где нет каскада CSS)", () => {
    expect(buttonTextVariants({ variant: "primary" })).toContain("text-primary-foreground");
    expect(buttonTextVariants({ variant: "destructive" })).toContain("text-destructive");
  });
});
