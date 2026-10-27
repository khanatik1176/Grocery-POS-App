import { useState } from "react";
import { Text, View } from "react-native";

import { apiError } from "@/api/client";
import { fetchPreorderDefaults, savePreorderDefaults } from "@/api/pos";
import { FormSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, ErrorState, Field, Page, ToggleRow } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";

export default function Alerts() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(fetchPreorderDefaults, [], { refocus: false });
  return (
    <Page>
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {loading ? <FormSkeleton fields={2} /> : !data ? null : <AlertsForm initial={data} onSaved={() => toast("Alert defaults saved")} />}
    </Page>
  );
}

function AlertsForm({ initial, onSaved }: { initial: { reorder_level: number; lead_days: number; notify_enabled: boolean }; onSaved: () => void }) {
  const [reorder, setReorder] = useState(String(initial.reorder_level));
  const [lead, setLead] = useState(String(initial.lead_days));
  const [notify, setNotify] = useState(initial.notify_enabled);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      await savePreorderDefaults({ reorder_level: Number(reorder), lead_days: Number(lead), notify_enabled: notify });
      onSaved();
    } catch (err) {
      setSaveError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Banner text={saveError} />
      <Text className="px-1 text-sm leading-5 text-muted">
        These defaults apply to every product. Any product can override them from its own page.
      </Text>
      <Card className="overflow-hidden">
        <ToggleRow title="Reorder alerts" subtitle="List low products under Reports → Buy soon" value={notify} onChange={setNotify} last />
      </Card>
      <Card className="gap-4 p-4">
        <Field label="Reorder when stock is at or below" value={reorder} onChangeText={setReorder} keyboardType="number-pad" suffix="units" />
        <Field label="Warn about expiry this many days ahead" value={lead} onChangeText={setLead} keyboardType="number-pad" suffix="days" />
        <View>
          <Button label="Save defaults" busy={busy} onPress={() => void save()} />
        </View>
      </Card>
    </>
  );
}
