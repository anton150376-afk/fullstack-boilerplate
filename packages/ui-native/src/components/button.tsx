import { Pressable, Text, type PressableProps } from "react-native";

import { buttonTextVariants, buttonVariants, cn, type ButtonVariants } from "@boilerplate/ui-core";

// Uniwind привязывает className к Pressable/Text «из коробки» (без
// обёртки), поэтому единственная связь с ним — строки классов из
// ui-core (правило ui.md), как в ui-web/button.tsx. Активное/отключённое
// состояние — через псевдо-классы Uniwind active:/disabled: (поддержаны
// на бесплатной ветке, в отличие от hover:/group-*, см. B-261008-button-variants-web-only-modifiers).
export interface ButtonProps extends Omit<PressableProps, "children">, ButtonVariants {
  children: string;
}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), "active:opacity-70", className)}
      accessibilityRole="button"
      {...props}
    >
      <Text className={buttonTextVariants({ variant })}>{children}</Text>
    </Pressable>
  );
}
