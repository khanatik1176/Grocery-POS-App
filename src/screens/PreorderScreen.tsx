import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { fetchPreorderDefaults, savePreorderDefaults } from "../api/pos";
import { PageFormSkeleton } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";

export function PreorderScreen({ onBack }: { onBack: () => void }) {
  const [reorder, setReorder] = useState("5");
  const [lead, setLead] = useState("7");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreorderDefaults()
      .then((response) => {
        setReorder(String(response.data.reorder_level));
        setLead(String(response.data.lead_days));
        setNotify(response.data.notify_enabled);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await savePreorderDefaults({
        reorder_level: Number(reorder),
        lead_days: Number(lead),
        notify_enabled: notify,
      });
      setMessage("Store alert defaults are saved. A product can still override them.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Pre-order alerts" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        {loading ? <PageFormSkeleton fields={3} /> : (
        <View className="rounded-3xl bg-paper p-4">
          <Notice text={error} />
          {message ? <Text className="mb-3 rounded-xl bg-cream px-3 py-2 text-sm text-ink">{message}</Text> : null}
          <Field label="Reorder when stock is at or under" value={reorder} onChangeText={setReorder} keyboardType="number-pad" />
          <Field label="Treat expiry within this many days as soon" value={lead} onChangeText={setLead} keyboardType="number-pad" />
          <Button label={notify ? "Alerts are on" : "Alerts are off"} variant="secondary" onPress={() => setNotify((value) => !value)} />
          <View className="mt-3">
            <Button label="Save defaults" onPress={() => void save()} busy={busy} />
          </View>
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
