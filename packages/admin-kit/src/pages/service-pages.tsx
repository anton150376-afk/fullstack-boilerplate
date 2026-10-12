import { defaultServicePageLabels, resolveLabels, type ServicePageLabels } from "../labels.js";

export interface ServicePageProps {
  /** Подписи; незаданные остаются русскими. */
  labels?: Partial<ServicePageLabels>;
}

export function ForbiddenPage({ labels }: ServicePageProps) {
  const text = resolveLabels(defaultServicePageLabels, labels);
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{text.forbiddenTitle}</h1>
      <p className="text-muted-foreground">{text.forbiddenMessage}</p>
    </div>
  );
}

export function NotFoundPage({ labels }: ServicePageProps) {
  const text = resolveLabels(defaultServicePageLabels, labels);
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{text.notFoundTitle}</h1>
    </div>
  );
}

export interface LoginPageProps {
  onSubmit: (credentials: { email: string; password: string }) => void | Promise<void>;
  pending?: boolean;
  error?: string;
  /** Подписи; незаданные остаются русскими. */
  labels?: Partial<ServicePageLabels>;
}

// Заглушка до модуля аутентификации (M1, ROADMAP) — форма реальна,
// проверка — дело вызывающего кода.
export function LoginPage({ onSubmit, pending = false, error, labels }: LoginPageProps) {
  const text = resolveLabels(defaultServicePageLabels, labels);
  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-4 p-12"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = form.get("email");
        const password = form.get("password");
        void onSubmit({
          email: typeof email === "string" ? email : "",
          password: typeof password === "string" ? password : "",
        });
      }}
    >
      <h1 className="text-2xl font-semibold text-foreground">{text.loginTitle}</h1>
      <input
        name="email"
        type="email"
        placeholder={text.email}
        aria-label={text.email}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
      />
      <input
        name="password"
        type="password"
        placeholder={text.password}
        aria-label={text.password}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
      />
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {text.login}
      </button>
    </form>
  );
}
