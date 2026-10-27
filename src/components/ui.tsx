import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const COLORS = {
  canvas: "#F4F6F8",
  surface: "#FFFFFF",
  line: "#E4E7EC",
  ink: "#101828",
  body: "#344054",
  muted: "#667085",
  faint: "#98A2B3",
  brand: "#0E9F6E",
  brandDark: "#057A55",
  brandSoft: "#E7F6EF",
  warn: "#B54708",
  warnSoft: "#FEF0C7",
  danger: "#D92D20",
  dangerSoft: "#FEE4E2",
  info: "#1570EF",
  infoSoft: "#EFF8FF",
};

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 20, color = COLORS.body }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Scrollable page body on the light canvas. */
export function Page({
  children,
  refreshControl,
  padded = true,
  bottomInset = 32,
}: {
  children: ReactNode;
  refreshControl?: ComponentProps<typeof ScrollView>["refreshControl"];
  padded?: boolean;
  bottomInset?: number;
}) {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ padding: padded ? 16 : 0, paddingBottom: bottomInset, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-xl border border-line bg-surface ${className}`}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View className="mt-1 flex-row items-center justify-between px-1">
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
          <Text className="text-sm font-semibold text-brand">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  variant = "primary",
  icon,
  size = "md",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: "sm" | "md" | "lg";
}) {
  const box = {
    primary: "bg-brand",
    secondary: "border border-line bg-surface",
    ghost: "bg-transparent",
    danger: "bg-danger",
  }[variant];
  const tint = { primary: "#FFFFFF", secondary: COLORS.ink, ghost: COLORS.brand, danger: "#FFFFFF" }[variant];
  const height = { sm: "h-9 px-3", md: "h-12 px-4", lg: "h-14 px-5" }[size];
  const text = { sm: "text-sm", md: "text-base", lg: "text-lg" }[size];
  const off = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={off}
      className={`flex-row items-center justify-center gap-2 rounded-lg ${height} ${box} ${off ? "opacity-50" : "active:opacity-80"}`}
    >
      {busy ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === "sm" ? 16 : 20} color={tint} /> : null}
          <Text style={{ color: tint }} className={`${text} font-semibold`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
  size = 40,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: "default" | "brand" | "danger" | "dark";
  size?: number;
}) {
  const style = {
    default: { bg: COLORS.surface, fg: COLORS.ink, border: COLORS.line },
    brand: { bg: COLORS.brandSoft, fg: COLORS.brandDark, border: COLORS.brandSoft },
    danger: { bg: COLORS.dangerSoft, fg: COLORS.danger, border: COLORS.dangerSoft },
    dark: { bg: "rgba(16,24,40,0.7)", fg: "#FFFFFF", border: "transparent" },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: style.bg,
        borderColor: style.border,
        borderWidth: 1,
      }}
      className="items-center justify-center active:opacity-70"
    >
      <Icon name={icon} size={size * 0.5} color={style.fg} />
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  revealable = false,
  secureTextEntry,
  icon,
  suffix,
  ...props
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  revealable?: boolean;
  icon?: IconName;
  suffix?: string;
} & TextInputProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const border = error ? "border-danger" : focused ? "border-brand" : "border-line";

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-body">{label}</Text> : null}
      <View className={`flex-row rounded-lg border bg-surface px-3 ${props.multiline ? "min-h-[96px] items-start py-2" : "h-12 items-center"} ${border}`}>
        {icon ? (
          <View className="mr-2">
            <Icon name={icon} size={18} color={COLORS.faint} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={COLORS.faint}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          secureTextEntry={revealable ? hidden : secureTextEntry}
          textAlignVertical={props.multiline ? "top" : "center"}
          className={`flex-1 text-base text-ink ${props.multiline ? "" : "h-full"}`}
        />
        {suffix ? <Text className="ml-2 text-sm text-muted">{suffix}</Text> : null}
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
          >
            <Icon name={hidden ? "eye-outline" : "eye-off-outline"} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs text-danger">{error}</Text> : hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onScan,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onScan?: () => void;
}) {
  return (
    <View className="h-11 flex-row items-center rounded-lg border border-line bg-surface pl-3 pr-1">
      <Icon name="search" size={18} color={COLORS.faint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        autoCorrect={false}
        returnKeyType="search"
        className="ml-2 h-full flex-1 text-base text-ink"
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChangeText("")} className="px-2">
          <Icon name="close-circle" size={18} color={COLORS.faint} />
        </Pressable>
      ) : null}
      {onScan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan a code"
          onPress={onScan}
          className="ml-1 h-9 w-9 items-center justify-center rounded-md bg-brand-soft"
        >
          <Icon name="scan" size={20} color={COLORS.brandDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`h-9 flex-row items-center gap-1.5 rounded-full border px-3 ${selected ? "border-ink bg-ink" : "border-line bg-surface"}`}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? "#FFFFFF" : COLORS.muted} /> : null}
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-body"}`}>{label}</Text>
      {count !== undefined ? (
        <View className={`rounded-full px-1.5 ${selected ? "bg-white/20" : "bg-canvas"}`}>
          <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-muted"}`}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-lg bg-line/60 p-1">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            className={`h-9 flex-1 items-center justify-center rounded-md ${on ? "bg-surface" : ""}`}
            style={on ? { shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
          >
            <Text className={`text-sm ${on ? "font-semibold text-ink" : "font-medium text-muted"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Tone = "neutral" | "brand" | "warn" | "danger" | "info";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#F2F4F7", fg: COLORS.body },
  brand: { bg: COLORS.brandSoft, fg: COLORS.brandDark },
  warn: { bg: COLORS.warnSoft, fg: COLORS.warn },
  danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
  info: { bg: COLORS.infoSoft, fg: COLORS.info },
};

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const colors = TONES[tone];
  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-row items-center gap-1 self-start rounded-md px-2 py-0.5">
      {icon ? <Icon name={icon} size={12} color={colors.fg} /> : null}
      <Text style={{ color: colors.fg }} className="text-xs font-semibold">
        {label}
      </Text>
    </View>
  );
}

export function Banner({ text, tone = "danger", onDismiss }: { text: string | null | undefined; tone?: Tone; onDismiss?: () => void }) {
  if (!text) {
    return null;
  }
  const colors = TONES[tone];
  const icon: IconName = tone === "danger" ? "alert-circle" : tone === "brand" ? "checkmark-circle" : tone === "warn" ? "warning" : "information-circle";
  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-row items-start gap-2 rounded-lg px-3 py-2.5">
      <Icon name={icon} size={18} color={colors.fg} />
      <Text style={{ color: colors.fg }} className="flex-1 text-sm leading-5">
        {text}
      </Text>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={onDismiss}>
          <Icon name="close" size={18} color={colors.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
  tone?: Tone;
}) {
  const colors = TONES[tone];
  return (
    <View className="min-w-[46%] flex-1 rounded-xl border border-line bg-surface p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted">{label}</Text>
        {icon ? (
          <View style={{ backgroundColor: colors.bg }} className="h-7 w-7 items-center justify-center rounded-md">
            <Icon name={icon} size={15} color={colors.fg} />
          </View>
        ) : null}
      </View>
      <Text className="mt-1.5 text-xl font-bold text-ink" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text className="mt-0.5 text-xs text-muted">{sub}</Text> : null}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = "neutral",
  right,
  onPress,
  last = false,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: Tone;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const colors = TONES[danger ? "danger" : iconTone];
  const body = (
    <View className={`min-h-[56px] flex-row items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      {icon ? (
        <View style={{ backgroundColor: colors.bg }} className="h-9 w-9 items-center justify-center rounded-lg">
          <Icon name={icon} size={18} color={colors.fg} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className={`text-base font-medium ${danger ? "text-danger" : "text-ink"}`}>{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-sm text-muted">{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-forward" size={18} color={COLORS.faint} /> : null}
    </View>
  );
  if (!onPress) {
    return body;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="active:bg-canvas">
      {body}
    </Pressable>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  last = false,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      last={last}
      right={<Switch value={value} onValueChange={onChange} trackColor={{ true: COLORS.brand, false: COLORS.line }} thumbColor="#FFFFFF" />}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
}) {
  return (
    <View className="items-center rounded-xl border border-dashed border-line bg-surface px-6 py-10">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-canvas">
        <Icon name={icon} size={26} color={COLORS.muted} />
      </View>
      <Text className="mt-3 text-center text-base font-semibold text-ink">{title}</Text>
      {body ? <Text className="mt-1 text-center text-sm leading-5 text-muted">{body}</Text> : null}
      {action ? (
        <View className="mt-4">
          <Button label={action.label} icon={action.icon} onPress={action.onPress} size="sm" />
        </View>
      ) : null}
    </View>
  );
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (value: number) => void; min?: number }) {
  return (
    <View className="h-9 flex-row items-center rounded-lg border border-line bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value <= 1 && min === 0 ? "Remove" : "Decrease"}
        onPress={() => onChange(Math.max(min, value - 1))}
        className="h-full w-9 items-center justify-center active:bg-canvas"
      >
        <Icon name={value <= 1 && min === 0 ? "trash-outline" : "remove"} size={16} color={value <= 1 && min === 0 ? COLORS.danger : COLORS.ink} />
      </Pressable>
      <Text className="min-w-[28px] text-center text-base font-semibold text-ink">{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={() => onChange(value + 1)}
        className="h-full w-9 items-center justify-center active:bg-canvas"
      >
        <Icon name="add" size={16} color={COLORS.ink} />
      </Pressable>
    </View>
  );
}

/** Bottom sheet used for short forms (payments, loans, transfers). */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/40" />
        <View style={{ paddingBottom: insets.bottom + 16, maxHeight: "88%" }} className="rounded-t-2xl bg-surface">
          <View className="items-center pt-2">
            <View className="h-1 w-10 rounded-full bg-line" />
          </View>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
            <Text className="text-lg font-semibold text-ink">{title}</Text>
            <IconButton icon="close" label="Close" onPress={onClose} size={34} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, gap: 14 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Thumb({ uri, name, size = 48 }: { uri: string | null; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: COLORS.canvas }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 10 }} className="items-center justify-center bg-brand-soft">
      <Text style={{ fontSize: size * 0.4 }} className="font-bold text-brand-dark">
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function KeyValue({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={strong ? "text-base font-semibold text-ink" : "text-sm text-muted"}>{label}</Text>
      <Text className={strong ? "text-base font-bold text-ink" : "text-sm font-medium text-ink"}>{value}</Text>
    </View>
  );
}

/** Reveals the next slice of a list that is paged on the device. */
export function ShowMore({ remaining, onPress, noun = "more", step = 10 }: { remaining: number; onPress: () => void; noun?: string; step?: number }) {
  if (remaining <= 0) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 flex-row items-center justify-center gap-1.5 rounded-lg border border-line bg-surface active:bg-canvas"
    >
      <Text className="text-sm font-semibold text-brand">
        Show {Math.min(remaining, step)} {noun}
      </Text>
      <Text className="text-xs text-muted">({remaining} left)</Text>
      <Icon name="chevron-down" size={16} color={COLORS.brand} />
    </Pressable>
  );
}

/** Full-width empty view for a screen whose data failed to load, with a retry. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn’t load this"
      body={message}
      action={{ label: "Try again", icon: "refresh", onPress: onRetry }}
    />
  );
}
