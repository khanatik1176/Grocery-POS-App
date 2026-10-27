import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, Text, View } from "react-native";

import { apiError, mediaUrl } from "@/api/client";
import { fetchProduct, updatePreorder, type Lot, type ProductDetail } from "@/api/pos";
import { useSession } from "@/auth/session";
import { DetailSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, COLORS, ErrorState, Field, Page, SectionTitle, ShowMore, Thumb, ToggleRow } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";
import { daysUntil, prettyDate, priceSpan, taka } from "@/pos/format";

export default function Product() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { can } = useSession();
  const { data: product, setData, error, loading, refreshing, refresh } = useLoad(() => fetchProduct(barcode), [barcode]);
  const lots = useShowMore(product?.lots ?? [], 5);

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      <Stack.Screen options={{ title: product?.name ?? "Product" }} />
      {error && !product ? <ErrorState message={error} onRetry={() => void refresh()} /> : <Banner text={error} />}
      {loading ? <DetailSkeleton /> : null}
      {product ? (
        <>
          <Card className="p-4">
            <View className="flex-row gap-3">
              <Thumb uri={mediaUrl(product.image)} name={product.name} size={72} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-ink">{product.name}</Text>
                <Text className="text-sm text-muted">{product.barcode}</Text>
                <Text className="mt-1 text-base font-semibold text-body">{priceSpan(product.selling_from, product.selling_to)}</Text>
              </View>
            </View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-lg bg-canvas p-3">
                <Text className="text-xs text-muted">Total in stock</Text>
                <Text className={`text-2xl font-bold ${product.quantity === 0 ? "text-danger" : product.low_stock ? "text-warn" : "text-ink"}`}>
                  {product.quantity}
                </Text>
              </View>
              {product.locations.map((spot) => (
                <View key={spot.name} className="flex-1 rounded-lg bg-canvas p-3">
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {spot.name}
                  </Text>
                  <Text className="text-2xl font-bold text-ink">{spot.quantity}</Text>
                </View>
              ))}
            </View>
            <View className="mt-3 flex-row flex-wrap gap-1">
              {product.low_stock ? <Badge label={`Reorder · at or under ${product.preorder.reorder_level}`} tone="warn" icon="trending-down" /> : null}
              {product.expiring ? <Badge label={`Expires ${prettyDate(product.soonest_expiry)}`} tone="danger" icon="time-outline" /> : null}
            </View>
            {product.bundle_names.length > 0 ? (
              <View className="mt-3">
                <Banner tone="info" text={`Part of ${product.bundle_names.join(", ")}. Selling a combo draws stock from this product.`} />
              </View>
            ) : null}
          </Card>

          {can("inventory.receive") || can("inventory.transfer") ? (
            <View className="flex-row gap-2">
              {can("inventory.receive") ? (
                <View className="flex-1">
                  <Button
                    label="Receive more"
                    icon="download-outline"
                    onPress={() => router.push({ pathname: "/receive", params: { barcode: product.barcode } })}
                  />
                </View>
              ) : null}
              {can("inventory.transfer") ? (
                <View className="flex-1">
                  <Button
                    label="Transfer"
                    icon="swap-horizontal-outline"
                    variant="secondary"
                    disabled={product.quantity === 0}
                    onPress={() => router.push({ pathname: "/transfer", params: { barcode: product.barcode } })}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <SectionTitle title={`Batches · ${product.lots.filter((lot) => lot.quantity > 0).length} active`} />
          {product.lots.length === 0 ? (
            <Card className="p-4">
              <Text className="text-sm text-muted">No batches yet. Receive stock to add the first one.</Text>
            </Card>
          ) : (
            lots.visible.map((lot) => <LotCard key={`${lot.location}|${lot.expiry_date}|${lot.manufacturing_date}|${lot.mrp}|${lot.purchase_rate}|${lot.discount_rate}|${lot.origin}`} lot={lot} />)
          )}
          <ShowMore remaining={lots.remaining} onPress={lots.showMore} noun="batches" step={5} />

          <SectionTitle title="Pre-order alert" />
          <PreorderCard key={JSON.stringify(product.preorder)} product={product} editable={can("inventory.preorder")} onSaved={setData} />
        </>
      ) : null}
    </Page>
  );
}

function LotCard({ lot }: { lot: Lot }) {
  const days = daysUntil(lot.expiry_date);
  const empty = lot.quantity === 0;
  return (
    <Card className={`p-3.5 ${empty ? "opacity-60" : ""}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink">
          {lot.quantity} at {lot.location}
        </Text>
        {empty ? (
          <Badge label="Sold out" />
        ) : days < 0 ? (
          <Badge label="Expired" tone="danger" />
        ) : days <= 30 ? (
          <Badge label={`${days}d left`} tone="warn" />
        ) : (
          <Badge label="Fresh" tone="brand" />
        )}
      </View>
      <Text className="mt-1 text-xs text-muted">
        Made {prettyDate(lot.manufacturing_date)} · Expires {prettyDate(lot.expiry_date)} · From {lot.origin}
      </Text>
      <View className="mt-3 flex-row rounded-lg bg-canvas">
        {[
          ["MRP", taka(lot.mrp)],
          ["Cost", taka(lot.purchase_rate)],
          ["Disc.", `${Number(lot.discount_rate)}%`],
          ["Sells at", taka(lot.selling_price)],
        ].map(([label, value], index) => (
          <View key={label} className={`flex-1 px-2 py-2 ${index > 0 ? "border-l border-line" : ""}`}>
            <Text className="text-[11px] text-muted">{label}</Text>
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function PreorderCard({ product, editable, onSaved }: { product: ProductDetail; editable: boolean; onSaved: (detail: ProductDetail) => void }) {
  const toast = useToast();
  const [reorder, setReorder] = useState(String(product.preorder.reorder_level));
  const [lead, setLead] = useState(String(product.preorder.lead_days));
  const [notify, setNotify] = useState(product.preorder.notify_enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = Object.values(product.preorder.overrides).some(Boolean);

  async function save(payload: Record<string, number | boolean | null>, message: string) {
    setBusy(true);
    setError(null);
    try {
      onSaved((await updatePreorder(product.barcode, payload)).data);
      toast(message);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!editable) {
    return (
      <Card className="p-4">
        <Text className="text-sm text-body">
          Alerts {product.preorder.notify_enabled ? "on" : "off"} · reorder at {product.preorder.reorder_level} · expiry warning {product.preorder.lead_days} days ahead
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <View className="flex-row items-center justify-between px-4 pt-3">
        <Text className="text-sm text-muted">Using</Text>
        <Badge label={custom ? "Custom for this product" : "Store defaults"} tone={custom ? "info" : "neutral"} />
      </View>
      <ToggleRow title="Reorder alerts" subtitle="Show in Reports when stock runs low" value={notify} onChange={setNotify} />
      <View className="gap-3 p-4">
        <Banner text={error} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Reorder at" value={reorder} onChangeText={setReorder} keyboardType="number-pad" suffix="units" />
          </View>
          <View className="flex-1">
            <Field label="Expiry warning" value={lead} onChangeText={setLead} keyboardType="number-pad" suffix="days" />
          </View>
        </View>
        <Button
          label="Save alert"
          busy={busy}
          onPress={() => void save({ reorder_level: Number(reorder), lead_days: Number(lead), notify_enabled: notify }, "Alert saved")}
        />
        {custom ? (
          <Button
            label="Use store defaults"
            variant="ghost"
            size="sm"
            onPress={() => void save({ reorder_level: null, lead_days: null, notify_enabled: null }, "Back to store defaults")}
          />
        ) : null}
      </View>
    </Card>
  );
}
