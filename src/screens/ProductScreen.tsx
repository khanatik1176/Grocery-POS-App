import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError, mediaUrl } from "../api/client";
import { fetchProduct, updatePreorder, type ProductDetail } from "../api/pos";
import type { SessionUser } from "../api/types";
import { DetailSkeleton } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";
import { can } from "../pos/access";
import { prettyDate, priceSpan, taka } from "../pos/format";

export function ProductScreen({
  user,
  barcode,
  onBack,
}: {
  user: SessionUser;
  barcode: string;
  onBack: () => void;
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reorder, setReorder] = useState("");
  const [lead, setLead] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function apply(detail: ProductDetail) {
    setProduct(detail);
    setReorder(String(detail.preorder.reorder_level));
    setLead(String(detail.preorder.lead_days));
    setNotify(detail.preorder.notify_enabled);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProduct(barcode)
      .then((response) => {
        if (active) {
          apply(response.data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(apiError(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [barcode]);

  async function save(payload: Record<string, number | boolean | null>) {
    setBusy(true);
    setError(null);
    try {
      const response = await updatePreorder(barcode, payload);
      apply(response.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const image = mediaUrl(product?.image ?? null);

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title={product?.name ?? "Product"} onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12">
        <Notice text={error} />
        {loading ? <DetailSkeleton /> : null}
        {!loading && product ? (
          <View className="gap-3">
            <View className="rounded-3xl bg-paper p-4">
              <View className="flex-row gap-3">
                {image ? (
                  <Image source={{ uri: image }} style={{ width: 84, height: 84, borderRadius: 18 }} />
                ) : (
                  <View className="h-[84px] w-[84px] items-center justify-center rounded-2xl bg-cream">
                    <Text className="text-3xl font-bold text-leaf">{product.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-xl font-bold text-ink">{product.name}</Text>
                  <Text className="text-sm text-mist">{product.barcode}</Text>
                  <Text className="mt-2 text-lg font-semibold text-leaf">{product.quantity} on hand</Text>
                  <Text className="text-sm text-mist">{priceSpan(product.selling_from, product.selling_to)}</Text>
                </View>
              </View>
              {product.bundle_names.length > 0 ? (
                <Text className="mt-3 rounded-2xl bg-cream px-3 py-2 text-sm text-ink">
                  Included in {product.bundle_names.join(", ")}. Selling a combo takes stock from this product.
                </Text>
              ) : null}
            </View>
            {product.lots.map((lot) => (
              <View
                key={`${lot.expiry_date}-${lot.mrp}-${lot.purchase_rate}-${lot.discount_rate}-${lot.origin}-${lot.location}`}
                className="rounded-3xl bg-paper p-4"
              >
                <Text className="text-base font-bold text-ink">
                  {lot.quantity} at {lot.location}
                </Text>
                <Text className="mt-1 text-sm text-mist">
                  Made {prettyDate(lot.manufacturing_date)} · Exp {prettyDate(lot.expiry_date)}
                </Text>
                <Text className="mt-1 text-sm text-mist">
                  MRP {taka(lot.mrp)} · Buy {taka(lot.purchase_rate)} · Discount {lot.discount_rate}% · Sell {taka(lot.selling_price)}
                </Text>
                <Text className="mt-1 text-sm text-mist">Source {lot.origin}</Text>
              </View>
            ))}
            <View className="rounded-3xl bg-paper p-4">
              <Text className="text-lg font-bold text-ink">Pre-order alert</Text>
              <Text className="mt-1 text-sm leading-5 text-mist">
                The register warns when stock is at or under the threshold. Clearing a field returns that product to the store default.
              </Text>
              {can(user, "inventory.preorder") ? (
                <View className="mt-3">
                  <Field label="Reorder at" value={reorder} onChangeText={setReorder} keyboardType="number-pad" />
                  <Field label="Lead days" value={lead} onChangeText={setLead} keyboardType="number-pad" />
                  <Button
                    label={notify ? "Alerts on" : "Alerts off"}
                    variant="secondary"
                    onPress={() => setNotify((value) => !value)}
                  />
                  <View className="mt-3 gap-2">
                    <Button
                      label="Save alert"
                      busy={busy}
                      onPress={() =>
                        void save({
                          reorder_level: Number(reorder),
                          lead_days: Number(lead),
                          notify_enabled: notify,
                        })
                      }
                    />
                    <Button
                      label="Use store defaults"
                      variant="secondary"
                      onPress={() => void save({ reorder_level: null, lead_days: null, notify_enabled: null })}
                    />
                  </View>
                </View>
              ) : (
                <Text className="mt-3 text-base text-ink">
                  Reorder at {product.preorder.reorder_level}, look ahead {product.preorder.lead_days} days, alerts{" "}
                  {product.preorder.notify_enabled ? "on" : "off"}.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
