import { useState } from "react";
import { Text, View } from "react-native";

import { apiError } from "@/api/client";
import { fetchStoreSettings, saveStoreSettings, type StoreSettings } from "@/api/pos";
import { FormSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, ErrorState, Field, Page, SectionTitle, ToggleRow } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";

export default function Settings() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(fetchStoreSettings, [], { refocus: false });
  if (loading || !data) {
    return (
      <Page>
        {error && !loading ? <ErrorState message={error} onRetry={() => void reload()} /> : <FormSkeleton fields={6} />}
      </Page>
    );
  }
  return <SettingsForm initial={data} onSaved={() => toast("Settings saved")} />;
}

function SettingsForm({ initial, onSaved }: { initial: StoreSettings; onSaved: () => void }) {
  const [form, setForm] = useState<StoreSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function patch<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      setForm((await saveStoreSettings(form)).data);
      onSaved();
    } catch (err) {
      setSaveError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page bottomInset={48}>
      <Banner text={saveError} />
      <SectionTitle title="Store" />
      <Card className="p-4">
        <Field label="Store name" value={form.store_name} onChangeText={(value) => patch("store_name", value)} />
      </Card>

      <SectionTitle title="Mobile wallets" />
      <Card className="gap-3 p-4">
        <Field label="bKash merchant number" icon="phone-portrait-outline" value={form.bkash_number} onChangeText={(value) => patch("bkash_number", value)} keyboardType="phone-pad" />
        <Field label="Nagad merchant number" icon="phone-portrait-outline" value={form.nagad_number} onChangeText={(value) => patch("nagad_number", value)} keyboardType="phone-pad" />
        <Field label="Rocket merchant number" icon="phone-portrait-outline" value={form.rocket_number} onChangeText={(value) => patch("rocket_number", value)} keyboardType="phone-pad" />
        <Field
          label="Wait for payment SMS"
          hint="After this, the cashier enters the transaction manually (15–180 s)."
          value={String(form.payment_timeout_seconds)}
          onChangeText={(value) => patch("payment_timeout_seconds", Number(value.replace(/\D/g, "")) || 0)}
          keyboardType="number-pad"
          suffix="seconds"
        />
      </Card>

      <SectionTitle title="Receipts" />
      <Card className="overflow-hidden">
        <ToggleRow title="SMS receipt link" subtitle={`Sent via ${form.sms_mechanism === "log" ? "register log (gateway not connected)" : form.sms_mechanism}`} value={form.sms_enabled} onChange={(value) => patch("sms_enabled", value)} />
        <ToggleRow title="Email receipt" subtitle={`Sent via ${form.email_mechanism === "server" ? "server mailer" : form.email_mechanism}`} value={form.email_enabled} onChange={(value) => patch("email_enabled", value)} last />
      </Card>
      <Card className="gap-3 p-4">
        <View className="gap-1.5">
          <Field label="SMS message" value={form.sms_template} onChangeText={(value) => patch("sms_template", value)} multiline />
          <Text className="text-xs text-muted">Placeholders: {"{url}"} receipt link, {"{total}"} amount, {"{number}"} receipt number.</Text>
        </View>
        <Field
          label="Public receipt link base"
          hint="Leave empty to use this server's address."
          value={form.receipt_base_url}
          onChangeText={(value) => patch("receipt_base_url", value)}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://receipts.example.com"
        />
      </Card>
      <Button label="Save settings" size="lg" busy={busy} onPress={() => void save()} />
    </Page>
  );
}
