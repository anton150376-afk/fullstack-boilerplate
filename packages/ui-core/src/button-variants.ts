import { cva, type VariantProps } from "class-variance-authority";

// Классы, не JSX — платформенно-независимая часть (раздел "Фаза 6"
// задания, пункт 5; правило ui.md: "варианты в ui-core"). ui-web и
// ui-native (Фаза 7) берут отсюда один и тот же набор вариантов и
// рисуют его каждый на своём примитиве.
//
// Только утилиты, которые Uniwind понимает на native (раздел "Фаза 7"
// задания, пункт 3: на бесплатной ветке нет hover: и group-*) — hover:,
// transition-colors, whitespace-nowrap, outline-none и селекторы вида
// [&_svg] (относительный CSS-селектор, веб-only понятие) остаются в
// ui-web/button.tsx отдельным cva, который добавляется поверх этого
// (см. B-261008-button-variants-web-only-modifiers в docs/BACKLOG.md).
//
// Имена утилит (bg-primary, bg-destructive, ...) и состав вариантов —
// по образцу настоящего shadcn init -b base (CLI, не сайт): тот же
// style "base-nova" сгенерировал src/components/ui/button.tsx с этими
// же именами классов, один раз, до переноса в этот пакет.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border bg-background text-foreground",
        ghost: "",
        destructive: "bg-destructive/10 text-destructive",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// На вебе цвет текста наследуется от контейнера каскадом CSS — ui-web
// не нуждается в этой переменной. На native текст — отдельный элемент
// Text без наследования (ui-native/button.tsx применяет это на Text
// рядом с buttonVariants на Pressable, не вместо него).
export const buttonTextVariants = cva("", {
  variants: {
    variant: {
      primary: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
