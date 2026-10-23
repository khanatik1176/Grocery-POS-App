import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <View className="h-6 w-6 items-center justify-center">
      <View className="h-3.5 w-5 items-center justify-center rounded-full border-2 border-slate-600">
        <View className="h-1.5 w-1.5 rounded-full bg-slate-700" />
      </View>
      {off ? (
        <View
          style={{
            position: "absolute",
            width: 22,
            height: 2,
            borderRadius: 1,
            backgroundColor: "#334155",
            transform: [{ rotate: "-35deg" }],
          }}
        />
      ) : null}
    </View>
  );
}

export function Field({
  label,
  revealable = false,
  secureTextEntry,
  ...props
}: { label: string; revealable?: boolean } & TextInputProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-mist">{label}</Text>
      <View>
        <TextInput
          placeholderTextColor="#8C8376"
          {...props}
          secureTextEntry={revealable ? hidden : secureTextEntry}
          className={`rounded-2xl border border-cream bg-cream px-3 py-3 text-base text-ink ${revealable ? "pr-12" : ""}`}
        />
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((value) => !value)}
            className="absolute bottom-0 right-1 top-0 items-center justify-center px-2"
          >
            <EyeIcon off={hidden} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const colors = {
    primary: "bg-saffron",
    secondary: "border border-ink bg-paper",
    danger: "bg-clay",
  }[variant];
  const text = variant === "danger" ? "text-cream" : "text-ink";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      className={`items-center rounded-full px-4 py-3 ${colors} ${disabled || busy ? "opacity-60" : ""}`}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? "#1A1612" : "#F3EEE4"} />
      ) : (
        <Text className={`text-base font-black ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-ink">{children}</View>;
}

export function Notice({ text }: { text: string | null }) {
  if (!text) {
    return null;
  }
  return <Text className="mb-3 rounded-2xl bg-[#F8E4DF] px-3 py-2 text-sm text-clay">{text}</Text>;
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} className="mr-3 rounded-full bg-bark px-3 py-1">
          <Text className="text-sm font-semibold text-cream">Back</Text>
        </Pressable>
      ) : null}
      <Text className="flex-1 text-lg font-black text-cream">{title}</Text>
    </View>
  );
}
