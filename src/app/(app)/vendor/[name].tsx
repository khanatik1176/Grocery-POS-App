import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { fetchVendorLedger, payVendor } from "@/api/pos";
import { useSession } from "@/auth/session";
import { DateField } from "@/components/DateField";
import { DetailSkeleton, ListFooter } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, COLORS, EmptyState, ErrorState, Field, Icon, Page, SectionTitle, Sheet, Stat } from "@/components/ui";
import { usePaged } from "@/hooks/usePaged";
import { prettyDate, taka, todayIso } from "@/pos/format";

export default function VendorLedger() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { can } = useSession();
  const toast = useToast();
  const ledger = usePaged((page) => fetchVendorLedger(name, page), (response) => response.entries, [name]);
  const { meta: data, error, loading, refreshing, refresh, reload } = ledger;
  const entries = ledger.items;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setSheetError(null);
    try {
      await payVendor({ vendor: name, amount, paid_on: paidOn, note });
      setOpen(false);
      setAmount("");
      setNote("");
      toast("Payment recorded");
      void reload();
    } catch (err) {
      setSheetError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      <Stack.Screen options={{ title: name }} />
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : <Banner text={error} />}
      {loading ? <DetailSkeleton /> : null}
      {data ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Stat label="Purchased" value={taka(data.purchased)} icon="download-outline" tone="info" />
            <Stat label="Paid" value={taka(data.paid)} icon="checkmark-done-outline" tone="brand" />
          </View>
          <Card className={`flex-row items-center justify-between p-4 ${Number(data.balance) > 0 ? "border-warn/30 bg-warn-soft" : ""}`}>
            <View>
              <Text className="text-xs font-medium text-muted">Balance due</Text>
              <Text className={`text-2xl font-bold ${Number(data.balance) > 0 ? "text-warn" : "text-brand-dark"}`}>{taka(data.balance)}</Text>
            </View>
            {can("accounting.pay") ? (
              <Button
                label="Pay"
                icon="add"
                onPress={() => {
                  setAmount(Number(data.balance) > 0 ? data.balance : "");
                  setOpen(true);
                }}
              />
            ) : null}
          </Card>

          <SectionTitle title="Ledger" />
          {entries.length === 0 ? (
            <EmptyState icon="document-text-outline" title="No entries yet" />
          ) : (
            <Card className="overflow-hidden">
              {entries.map((entry, index) => {
                const payment = entry.kind === "payment";
                return (
                  <View key={index} className={`flex-row items-center gap-3 px-4 py-3 ${index < entries.length - 1 ? "border-b border-line" : ""}`}>
                    <View className={`h-9 w-9 items-center justify-center rounded-full ${payment ? "bg-brand-soft" : "bg-info-soft"}`}>
                      <Icon name={payment ? "arrow-up" : "cube-outline"} size={16} color={payment ? COLORS.brandDark : COLORS.info} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text className="text-xs text-muted" numberOfLines={1}>
                        {prettyDate(entry.date)}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-sm font-semibold ${payment ? "text-brand-dark" : "text-ink"}`}>
                        {payment ? "−" : "+"}
                        {taka(entry.amount)}
                      </Text>
                      <Text className="text-[11px] text-muted">Bal {taka(entry.balance)}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
          {ledger.hasMore ? (
            ledger.loadingMore ? (
              <ListFooter loading done={false} />
            ) : (
              <Button label={`Load more (${data.count - entries.length} older)`} variant="secondary" onPress={() => void ledger.loadMore()} />
            )
          ) : entries.length > 0 ? (
            <ListFooter loading={false} done label={`All ${data.count} entries shown`} />
          ) : null}
        </>
      ) : null}

      <Sheet visible={open} title={`Pay ${name}`} onClose={() => setOpen(false)}>
        <Banner text={sheetError} />
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="৳" />
        <DateField label="Paid on" value={paidOn} onChange={setPaidOn} maximumDate={new Date()} />
        <Field label="Note (optional)" value={note} onChangeText={setNote} />
        <Button label="Save payment" busy={busy} disabled={!(Number(amount) > 0)} onPress={() => void pay()} />
      </Sheet>
    </Page>
  );
}
