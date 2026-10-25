import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Animated, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PulseContext = createContext<Animated.Value | null>(null);

const TONE = {
  dark: "#4E463C",
  light: "#E4DCCF",
};

export function SkeletonGroup({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <PulseContext.Provider value={opacity}>
      <View accessibilityRole="progressbar" accessibilityLabel="Loading">
        {children}
      </View>
    </PulseContext.Provider>
  );
}

function usePulse() {
  const shared = useContext(PulseContext);
  const local = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (shared) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(local, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(local, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [local, shared]);

  return shared ?? local;
}

export function Bone({
  height,
  width = "100%",
  radius = 12,
  tone = "dark",
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  tone?: keyof typeof TONE;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = usePulse();

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: TONE[tone],
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PageListSkeleton({ rows = 4, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <SkeletonGroup>
      <View className="gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} className="flex-row gap-3 rounded-3xl bg-paper p-3">
            {thumb ? <Bone width={72} height={72} radius={16} tone="light" /> : null}
            <View className="flex-1 justify-center gap-2">
              <Bone height={16} tone="light" />
              <Bone height={12} width="62%" tone="light" />
              <Bone height={12} width="40%" tone="light" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

export function PageFormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <SkeletonGroup>
      <View className="rounded-3xl bg-paper p-4">
        {Array.from({ length: fields }, (_, index) => (
          <View key={index} className="mb-3">
            <Bone height={10} width="34%" tone="light" />
            <View className="h-2" />
            <Bone height={48} radius={16} tone="light" />
          </View>
        ))}
        <Bone height={48} radius={24} tone="light" />
      </View>
    </SkeletonGroup>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonGroup>
      <View className="gap-3">
        <View className="flex-row gap-3 rounded-3xl bg-paper p-4">
          <Bone width={84} height={84} radius={18} tone="light" />
          <View className="flex-1 justify-center gap-2">
            <Bone height={20} tone="light" />
            <Bone height={12} width="48%" tone="light" />
            <Bone height={16} width="36%" tone="light" />
          </View>
        </View>
        <View className="gap-2 rounded-3xl bg-paper p-4">
          <Bone height={16} width="46%" tone="light" />
          <Bone height={12} tone="light" />
          <Bone height={12} width="72%" tone="light" />
        </View>
        <View className="gap-2 rounded-3xl bg-paper p-4">
          <Bone height={16} width="40%" tone="light" />
          <Bone height={48} radius={16} tone="light" />
          <Bone height={48} radius={16} tone="light" />
          <Bone height={48} radius={24} tone="light" />
        </View>
      </View>
    </SkeletonGroup>
  );
}

export function StatBlockSkeleton() {
  return (
    <SkeletonGroup>
      <View className="gap-3">
        <View className="rounded-3xl bg-paper p-4">
          <Bone height={12} width="28%" tone="light" />
          <View className="h-3" />
          <Bone height={32} width="48%" tone="light" />
          <View className="h-2" />
          <Bone height={14} width="70%" tone="light" />
        </View>
        <View className="rounded-3xl bg-paper p-4">
          <Bone height={16} width="40%" tone="light" />
          <View className="mt-3 gap-2">
            <Bone height={14} tone="light" />
            <Bone height={14} width="80%" tone="light" />
            <Bone height={14} width="64%" tone="light" />
          </View>
        </View>
      </View>
    </SkeletonGroup>
  );
}

export function BootSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-ink">
      <SkeletonGroup>
        <View className="flex-1 justify-center px-6">
          <Bone width={48} height={48} radius={14} />
          <View className="mt-5">
            <Bone height={52} width="52%" />
          </View>
          <View className="mt-3">
            <Bone height={16} width="78%" />
          </View>
          <View className="mt-8 overflow-hidden rounded-[28px] bg-paper">
            <View className="h-2 bg-saffron" />
            <View className="p-5">
              <Bone height={10} width="24%" tone="light" />
              <View className="mt-2">
                <Bone height={48} radius={16} tone="light" />
              </View>
              <View className="mt-4">
                <Bone height={10} width="30%" tone="light" />
              </View>
              <View className="mt-2">
                <Bone height={48} radius={16} tone="light" />
              </View>
              <View className="mt-4">
                <Bone height={48} radius={24} tone="light" />
              </View>
            </View>
          </View>
        </View>
      </SkeletonGroup>
    </SafeAreaView>
  );
}

export function HomeSkeleton() {
  return (
    <SkeletonGroup>
      <View>
        <Bone height={140} radius={28} />
        <View className="mt-4 overflow-hidden rounded-[28px] bg-paper">
          {Array.from({ length: 4 }, (_, index) => (
            <View key={index} className={`px-4 py-4 ${index > 0 ? "border-t border-cream" : ""}`}>
              <Bone height={18} width="42%" tone="light" />
              <View className="mt-2">
                <Bone height={12} width="68%" tone="light" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}
