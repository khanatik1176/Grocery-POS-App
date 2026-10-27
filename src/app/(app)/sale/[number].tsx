import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, Text, View } from "react-native";

import { fetchSale } from "@/api/pos";
import { DetailSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, COLORS, ErrorState, Icon, KeyValue, Page, SectionTitle } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { PAYMENT_LABELS, prettyTime, taka } from "@/pos/format";
import { printHtml } from "@/pos/print";

export default function SaleDetail() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const toast = useToast();
  const { data: sale, error, loading, refreshing, refresh } = useLoad(() => fetchSale(number), [number], { refocus: false });
  const failed = error !== null && !sale;
  const [printing, setPrinting] = useState(false);

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      <Stack.Screen options={{ title: `Sale #${number}` }} />
      {failed ? <ErrorState message={error} onRetry={() => void refresh()} /> : <Banner text={error} />}
      {loading ? <DetailSkeleton /> : null}
      {sale ? (
        <>
          <Card className="items-center px-4 py-5">
            <Text className="text-sm font-medium text-muted">{prettyTime(sale.created_at)}</Text>
            <Text className="mt-1 text-4xl font-bold text-ink">{taka(sale.total)}</Text>
            <View className="mt-2 flex-row gap-2">
              <Badge label={PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method} tone="brand" />
              <Badge label={sale.location} icon="storefront-outline" />
            </View>
          </Card>

          <SectionTitle title="Items" />
          <Card className="p-4">
            {sale.lines.map((line, index) => (
              <View key={`${line.name}-${index}`} className={`flex-row justify-between py-2 ${index > 0 ? "border-t border-line" : ""}`}>
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="shrink text-sm font-medium text-ink">{line.name}</Text>
                    {line.kind === "bundle" ? <Badge label="Combo" tone="info" /> : null}
                  </View>
                  <Text className="text-xs text-muted">
                    {line.quantity} × {taka(line.unit_price)}
                    {line.detail ? ` · ${line.detail}` : ""}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-ink">{taka(line.line_total)}</Text>
              </View>
            ))}
          </Card>

          <SectionTitle title="Payment" />
          <Card className="p-4">
            <KeyValue label="Total" value={taka(sale.total)} strong />
            {sale.payment_method === "cash" ? (
              <>
                <KeyValue label="Cash received" value={taka(sale.amount_taken)} />
                <KeyValue label="Change given" value={taka(sale.change)} />
              </>
            ) : null}
            {sale.txn_number ? <KeyValue label={sale.payment_method === "card" ? "Approval code" : "Transaction ID"} value={sale.txn_number} /> : null}
            <View className="my-2 border-t border-dashed border-line" />
            <KeyValue label="Cost of goods" value={taka(sale.cost)} />
            <KeyValue label="Gross profit" value={taka(sale.profit)} />
          </Card>

          <SectionTitle title="Details" />
          <Card className="p-4">
            <KeyValue label="Receipt no." value={`#${sale.number}`} />
            <KeyValue label="Cashier" value={sale.cashier || "—"} />
            <KeyValue label="Customer mobile" value={sale.customer_phone || "—"} />
            <KeyValue label="Customer email" value={sale.customer_email || "—"} />
            {sale.notices.map((notice, index) => (
              <View key={index} className="mt-2 flex-row items-center gap-2">
                <Icon name={notice.channel === "sms" ? "chatbubble-outline" : "mail-outline"} size={16} color={COLORS.muted} />
                <Text className="flex-1 text-xs text-muted">
                  Receipt {notice.channel === "sms" ? "SMS" : "email"} sent to {notice.destination} · {prettyTime(notice.created_at)}
                </Text>
              </View>
            ))}
          </Card>

          <Button
            label="Reprint receipt"
            icon="print-outline"
            size="lg"
            busy={printing}
            onPress={() => {
              setPrinting(true);
              printHtml(sale.receipt_html)
                .then((ok) => ok && toast("Receipt sent to printer"))
                .catch(() => toast("Printing was cancelled or failed.", "error"))
                .finally(() => setPrinting(false));
            }}
          />
        </>
      ) : null}
    </Page>
  );
}
