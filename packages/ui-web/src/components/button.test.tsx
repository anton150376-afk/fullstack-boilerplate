import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button.js";

describe("Button", () => {
  it("рендерит children и реагирует на клик", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Добавить</Button>);

    const button = screen.getByRole("button", { name: "Добавить" });
    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("по умолчанию — primary/md, применяет variant/size из ui-core", () => {
    render(<Button data-testid="btn">Кнопка</Button>);
    const button = screen.getByTestId("btn");

    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("h-10");
  });

  it("variant=outline и size=sm меняют классы", () => {
    render(
      <Button data-testid="btn" variant="outline" size="sm">
        Кнопка
      </Button>,
    );
    const button = screen.getByTestId("btn");

    expect(button.className).toContain("border");
    expect(button.className).toContain("h-8");
  });

  it("disabled делает кнопку недоступной для клика", () => {
    const onClick = vi.fn();
    render(
      <Button data-testid="btn" disabled onClick={onClick}>
        Кнопка
      </Button>,
    );

    screen.getByTestId("btn").click();

    expect(onClick).not.toHaveBeenCalled();
  });
});
