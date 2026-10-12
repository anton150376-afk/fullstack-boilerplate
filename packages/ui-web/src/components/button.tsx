import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

import { buttonVariants, cn, type ButtonVariants } from "@boilerplate/ui-core";

// Base UI — только тело (поведение и доступность), классы — из ui-core
// (правило ui.md: "Стили только токенами; варианты в ui-core"). Имена
// пропсов (variant, size) парны с ui-native (Фаза 7) — тот рисует те же
// варианты на своём примитиве Uniwind.
export interface ButtonProps extends ButtonPrimitive.Props, ButtonVariants {}

// Веб-only модификаторы (hover:, transition-colors, селектор [&_svg] —
// не понятия Uniwind на native, раздел "Фаза 7" задания, пункт 3) —
// отдельный cva поверх ui-core/buttonVariants, не внутри него
// (B-261008-button-variants-web-only-modifiers). Variant здесь тот же
// набор ключей, что в ui-core — значения не пересекаются с базовым
// cva, итоговая строка классов идентична тому, что было до разделения.
const webOnlyVariants = cva(
  "whitespace-nowrap transition-colors outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "hover:bg-primary-hover",
        secondary: "hover:bg-muted",
        outline: "hover:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive: "hover:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), webOnlyVariants({ variant }), className)}
      {...props}
    />
  );
}
