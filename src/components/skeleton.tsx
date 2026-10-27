import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, Text, View, type StyleProp, type ViewStyle } from "react-native";

// One shared 0→1 sweep drives every placeholder in a group, so the shimmer moves in step.
const SweepContext = createContext<Animated.Value | null>(null);
const BAND = 90;

function sweep(value: Animated.Value) {
  return Animated.loop(
    Animated.timing(value, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
  );
}

export function SkeletonGroup({ children }: { children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = sweep(progress);
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <SweepContext.Provider value={progress}>
      <View accessibilityRole="progressbar" accessibilityLabel="Loading">
        {children}
      </View>
    </SweepContext.Provider>
  );
}

function useSweep() {
  const shared = useContext(SweepContext);
  const [local] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (shared) {
      return;
    }
    const loop = sweep(local);
    loop.start();
    return () => loop.stop();
  }, [local, shared]);

  return shared ?? local;
}

export function Bone({
  height,
  width = "100%",
  radius = 6,
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useSweep();
  const [span, setSpan] = useState(0);
  return (
    <View
      onLayout={(event) => setSpan(event.nativeEvent.layout.width)}
      style={[{ height, width, borderRadius: radius, backgroundColor: "#E9ECF0", overflow: "hidden" }, style]}
    >
      {span > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: BAND,
            backgroundColor: "rgba(255,255,255,0.65)",
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-BAND, span + BAND] }) },
              { skewX: "-20deg" },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

/** Spinner row shown under a list while its next page loads, or an end-of-list note. */
export function ListFooter({ loading, done, label }: { loading: boolean; done: boolean; label?: string }) {
  if (loading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color="#0E9F6E" />
      </View>
    );
  }
  if (done && label) {
    return <Text className="py-3 text-center text-xs text-muted">{label}</Text>;
  }
  return null;
}

export function ListSkeleton({ rows = 5, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <SkeletonGroup>
      <View className="overflow-hidden rounded-xl border border-line bg-surface">
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} className={`flex-row items-center gap-3 px-4 py-3 ${index < rows - 1 ? "border-b border-line" : ""}`}>
            {thumb ? <Bone width={48} height={48} radius={10} /> : null}
            <View className="flex-1 gap-2">
              <Bone height={14} width="70%" />
              <Bone height={11} width="45%" />
            </View>
            <Bone width={44} height={22} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

export function StatsSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <SkeletonGroup>
      <View className="flex-row flex-wrap gap-3">
        {Array.from({ length: tiles }, (_, index) => (
          <View key={index} className="min-w-[46%] flex-1 gap-2 rounded-xl border border-line bg-surface p-3.5">
            <Bone height={11} width="50%" />
            <Bone height={22} width="70%" />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <SkeletonGroup>
      <View className="gap-4 rounded-xl border border-line bg-surface p-4">
        {Array.from({ length: fields }, (_, index) => (
          <View key={index} className="gap-2">
            <Bone height={11} width="30%" />
            <Bone height={48} radius={8} />
          </View>
        ))}
        <Bone height={48} radius={8} />
      </View>
    </SkeletonGroup>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonGroup>
      <View className="gap-3">
        <View className="flex-row gap-3 rounded-xl border border-line bg-surface p-4">
          <Bone width={72} height={72} radius={12} />
          <View className="flex-1 justify-center gap-2">
            <Bone height={18} width="80%" />
            <Bone height={12} width="50%" />
          </View>
        </View>
        <StatsSkeleton tiles={2} />
        <ListSkeleton rows={3} thumb={false} />
      </View>
    </SkeletonGroup>
  );
}
