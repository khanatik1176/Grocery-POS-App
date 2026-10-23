import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { fetchSummary, type Summary } from "../api/pos";
import { Field, Notice, TopBar } from "../components/ui";
import { prettyDate, taka } from "../pos/format";

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "date", label: "A date" },
  { id: "week", label: "This week" },
  { id: "week_range", label: "Week range" },
  { id: "days30", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "range", label: "Date range" },
];

export function SummaryScreen({ onBack }: { onBack: () => void }) {
  const [preset, setPreset] = useState("today");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = { preset };
    if (preset === "date") {
      if (!date) {
        return;
      }
      params.date = date;
    }
    if (preset === "week_range" || preset === "range") {
      if (!start || !end) {
        return;
      }
      params.start = start;
      params.end = end;
    }
    let active = true;
    fetchSummary(params)
      .then((response) => {
        if (active) {
          setSummary(response.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(apiError(err));
        }
      });
    return () => {
      active = false;
    };
  }, [preset, date, start, end]);

  const needsDate = preset === "date";
  const needsRange = preset === "week_range" || preset === "range";

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Summary" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        <View className="mb-3 flex-row flex-wrap gap-2">
          {PRESETS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setPreset(item.id)}
              className={`rounded-full px-3 py-2 ${preset === item.id ? "bg-paper" : "bg-bark"}`}
            >
              <Text className={preset === item.id ? "font-semibold text-ink" : "text-cream"}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {needsDate ? (
          <View className="rounded-3xl bg-paper px-4 pt-4">
            <Field label="Date" value={date} onChangeText={setDate} placeholder="2026-10-23" autoCapitalize="none" />
          </View>
        ) : null}
        {needsRange ? (
          <View className="rounded-3xl bg-paper px-4 pt-4">
            <Field label="From" value={start} onChangeText={setStart} placeholder="2026-10-01" autoCapitalize="none" />
            <Field label="To" value={end} onChangeText={setEnd} placeholder="2026-10-23" autoCapitalize="none" />
          </View>
        ) : null}
        <Notice text={error} />
        {summary ? (
          <View className="mt-3 gap-3">
            <View className="rounded-3xl bg-paper p-4">
              <Text className="text-sm text-mist">
                {prettyDate(summary.start)} – {prettyDate(summary.end)}
              </Text>
              <Text className="mt-1 text-3xl font-bold text-ink">{taka(summary.sales_total)}</Text>
              <Text className="text-base text-ink">
                {summary.count} sales · Profit {taka(summary.profit)}
              </Text>
              {summary.sales.map((sale) => (
                <Text key={sale.number} className="mt-2 text-sm text-mist">
                  {sale.number} · {sale.payment_method} · {taka(sale.total)} · {sale.location}
                </Text>
              ))}
            </View>
            <View className="rounded-3xl bg-paper p-4">
              <Text className="text-lg font-bold text-ink">Buy soon</Text>
              {summary.depleted.length === 0 ? (
                <Text className="mt-2 text-mist">Nothing is under its reorder threshold.</Text>
              ) : (
                summary.depleted.map((item) => (
                  <View key={item.barcode} className="mt-3">
                    <Text className="font-semibold text-ink">{item.name}</Text>
                    <Text className="text-sm text-mist">
                      {item.quantity} on hand · reorder at {item.reorder_level}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
