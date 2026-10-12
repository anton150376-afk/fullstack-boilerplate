export interface TokenStorage {
  getToken(): string | null | Promise<string | null>;
  setToken(token: string | null): void | Promise<void>;
}

// Заглушка на тесты и до появления аутентификации (M1, ROADMAP) —
// настоящее хранилище (expo-secure-store на мобильном, что-то другое в
// вебе) приходит снаружи в Фазах 6–7: платформенные различия передаются
// в createApiClient, а не решаются внутри пакета (раздел "Фаза 5"
// задания, пункт 5.3).
export function createInMemoryTokenStorage(): TokenStorage {
  let token: string | null = null;

  return {
    getToken: () => token,
    setToken: (next) => {
      token = next;
    },
  };
}
