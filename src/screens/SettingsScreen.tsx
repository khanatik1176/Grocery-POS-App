import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { fetchStoreSettings, saveStoreSettings, type StoreSettings } from "../api/pos";
import { PageFormSkeleton } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreSettings()
      .then((response) => setForm(response.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  function patch<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function save() {
    if (!form) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await saveStoreSettings(form);
      setForm(response.data);
      setSaved(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Store settings" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        <Notice text={error} />
        {loading ? <PageFormSkeleton fields={7} /> : null}
        {!loading && form ? (
          <View className="rounded-3xl bg-paper p-4">
            <Field label="Store name" value={form.store_name} onChangeText={(value) => patch("store_name", value)} />
            <Field label="bKash number" value={form.bkash_number} onChangeText={(value) => patch("bkash_number", value)} keyboardType="phone-pad" />
            <Field label="Nagad number" value={form.nagad_number} onChangeText={(value) => patch("nagad_number", value)} keyboardType="phone-pad" />
            <Field label="Rocket number" value={form.rocket_number} onChangeText={(value) => patch("rocket_number", value)} keyboardType="phone-pad" />
            <Field
              label="Wallet wait in seconds"
              value={String(form.payment_timeout_seconds)}
              onChangeText={(value) => patch("payment_timeout_seconds", Number(value) || 0)}
              keyboardType="number-pad"
            />
            <Field
              label="SMS template"
              value={form.sms_template}
              onChangeText={(value) => patch("sms_template", value)}
              multiline
            />
            <Text className="mb-3 text-xs text-mist">Use {"{url}"}, {"{total}"}, and {"{number}"} in the SMS. The email carries the receipt itself.</Text>
            <Field
              label="Public receipt link"
              value={form.receipt_base_url}
              onChangeText={(value) => patch("receipt_base_url", value)}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:8001"
            />
            <Button
              label={form.sms_enabled ? "SMS is on" : "SMS is off"}
              variant="secondary"
              onPress={() => patch("sms_enabled", !form.sms_enabled)}
            />
            <Text className="mb-3 mt-1 text-xs text-mist">SMS mechanism: register log. A phone gateway can replace this later.</Text>
            <Button
              label={form.email_enabled ? "Email is on" : "Email is off"}
              variant="secondary"
              onPress={() => patch("email_enabled", !form.email_enabled)}
            />
            <Text className="mb-3 mt-1 text-xs text-mist">Email mechanism: server mailer.</Text>
            {saved ? <Text className="mb-3 text-sm text-leaf">Settings saved.</Text> : null}
            <Button label="Save settings" onPress={() => void save()} busy={busy} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
