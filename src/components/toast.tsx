import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, Icon } from "./ui";

type Tone = "success" | "error" | "info";
type Toast = { text: string; tone: Tone };

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, tone: Tone = "success") => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setToast({ text, tone });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, 2400);
    },
    [opacity],
  );

  const icon = toast?.tone === "error" ? "alert-circle" : toast?.tone === "info" ? "information-circle" : "checkmark-circle";
  const tint = toast?.tone === "error" ? "#FDA29B" : toast?.tone === "info" ? "#84CAFF" : "#6CE9A6";

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", left: 16, right: 16, top: insets.top + 8, opacity }}
        >
          <View
            style={{ backgroundColor: COLORS.ink, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}
            className="flex-row items-center gap-2 rounded-xl px-4 py-3"
          >
            <Icon name={icon} size={20} color={tint} />
            <Text className="flex-1 text-sm font-medium text-white">{toast.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
