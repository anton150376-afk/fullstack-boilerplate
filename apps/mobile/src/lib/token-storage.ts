import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

import type { TokenStorage } from "@boilerplate/api-client";

const KEY = "auth-token";

// expo-secure-store — Keychain/Keystore, не AsyncStorage и не MMKV без
// шифрования (раздел "Фаза 7" задания, пункт 5: токен не хранить иначе).
export function createSecureTokenStorage(): TokenStorage {
  return {
    getToken: () => getItemAsync(KEY),
    setToken: (token) => (token === null ? deleteItemAsync(KEY) : setItemAsync(KEY, token)),
  };
}
