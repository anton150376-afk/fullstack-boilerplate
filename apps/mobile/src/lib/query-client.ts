import { focusManager, onlineManager, QueryClient } from "@tanstack/query-core";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { AppState, Platform } from "react-native";

// onlineManager: NetInfo-подобное явное чтение начального состояния сети —
// без setOnline() при подписке TanStack Query считает приложение online
// до первого события, даже если сеть выключена с самого старта (раздел
// "Фаза 7" задания, пункт 5).
function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    void getNetworkStateAsync().then((state) => {
      setOnline(Boolean(state.isConnected));
    });

    const subscription = addNetworkStateListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return () => {
      subscription.remove();
    };
  });
}

// focusManager: AppState, не visibilitychange — и только на native.
// react-native-web эмулирует AppState через document.visibilityState уже
// сам, подключение здесь поверх него на вебе удваивало бы события, а не
// добавляло недостающее (защита по платформе, раздел "Фаза 7" задания,
// пункт 5).
function setupFocusManager(): void {
  if (Platform.OS === "web") {
    return;
  }

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (status) => {
      handleFocus(status === "active");
    });
    return () => {
      subscription.remove();
    };
  });
}

export function createMobileQueryClient(): QueryClient {
  setupOnlineManager();
  setupFocusManager();
  return new QueryClient();
}
