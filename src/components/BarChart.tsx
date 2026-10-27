import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { COLORS } from "./ui";

/**
 * Single-series vertical bar chart. Bars sit on a shared baseline with 4px
 * rounded tops and a 2px gap; tapping a bar shows its value above the plot.
 */
export function BarChart({
  data,
  height = 140,
  format,
  label,
}: {
  data: { key: string; value: number; label: string }[];
  height?: number;
  format: (value: number) => string;
  label: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => point.value), 0);
  const focus = selected !== null ? data[selected] : null;
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const ticks = data.length <= 7 ? data.map((_, index) => index) : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <View accessibilityLabel={`${label}. Total ${format(total)} across ${data.length} days.`}>
      <View className="mb-2 h-10 justify-center">
        {focus ? (
          <>
            <Text className="text-xs text-muted">{focus.label}</Text>
            <Text className="text-base font-bold text-ink">{format(focus.value)}</Text>
          </>
        ) : (
          <Text className="text-xs text-muted">Tap a bar to see the day’s total</Text>
        )}
      </View>
      <View style={{ height }} className="flex-row items-end border-b border-line">
        {data.map((point, index) => {
          const barHeight = max > 0 ? Math.max(point.value > 0 ? 3 : 0, (point.value / max) * height) : 0;
          const active = selected === index;
          return (
            <Pressable
              key={point.key}
              accessibilityRole="button"
              accessibilityLabel={`${point.label}: ${format(point.value)}`}
              onPress={() => setSelected(active ? null : index)}
              style={{ flex: 1, height, justifyContent: "flex-end", paddingHorizontal: 1 }}
            >
              <View
                style={{
                  height: barHeight,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: COLORS.brand,
                  opacity: selected === null || active ? 1 : 0.35,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View className="mt-1 flex-row">
        {data.map((point, index) => (
          <Text key={point.key} style={{ flex: 1 }} className="text-center text-[10px] text-muted" numberOfLines={1}>
            {ticks.includes(index) ? point.label : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}
