import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "./button.js";

describe("Button", () => {
  it("рендерит текст и реагирует на нажатие", async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Добавить</Button>);

    await fireEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Добавить")).toBeTruthy();
  });

  it("disabled не пропускает нажатие", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled>
        Кнопка
      </Button>,
    );

    await fireEvent.press(screen.getByRole("button"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
