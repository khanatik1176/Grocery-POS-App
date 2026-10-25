import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError, mediaUrl } from "../api/client";
import { fetchProducts, type ProductRow } from "../api/pos";
import type { SessionUser } from "../api/types";
import { PageListSkeleton } from "../components/skeleton";
import { Notice, TopBar } from "../components/ui";
import { can } from "../pos/access";
import { prettyDate, priceSpan } from "../pos/format";

export function InventoryScreen({
  user,
  onBack,
  onOpenProduct,
  onReceive,
  onLocations,
  onBundles,
  onPreorder,
}: {
  user: SessionUser;
  onBack: () => void;
  onOpenProduct: (barcode: string) => void;
  onReceive: () => void;
  onLocations: () => void;
  onBundles: () => void;
  onPreorder: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const handle = setTimeout(() => {
      fetchProducts(query.trim())
        .then((response) => {
          if (active) {
            setRows(response.data);
            setError(null);
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
    }, 200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const links = [
    can(user, "inventory.receive") ? { label: "Add stock", onPress: onReceive } : null,
    can(user, "inventory.locations") ? { label: "Places", onPress: onLocations } : null,
    can(user, "inventory.bundles") ? { label: "Combos", onPress: onBundles } : null,
    can(user, "inventory.preorder") ? { label: "Alerts", onPress: onPreorder } : null,
  ].filter((item): item is { label: string; onPress: () => void } => item !== null);

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Inventory" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or barcode"
          placeholderTextColor="#8C8376"
          className="mb-3 rounded-full border border-bark bg-bark px-4 py-3 text-base text-cream"
        />
        <View className="mb-4 flex-row flex-wrap gap-2">
          {links.map((link) => (
            <Pressable key={link.label} accessibilityRole="button" onPress={link.onPress} className="rounded-full bg-paper px-3 py-2">
              <Text className="text-sm font-semibold text-ink">{link.label}</Text>
            </Pressable>
          ))}
        </View>
        <Notice text={error} />
        {loading ? <PageListSkeleton /> : null}
        {!loading && rows.length === 0 && !error ? (
          <View className="rounded-3xl bg-paper p-5">
            <Text className="text-lg font-semibold text-ink">The shelf is empty</Text>
            <Text className="mt-2 text-base leading-6 text-mist">
              Scan a barcode, a QR code, or type the product in to put the first item on the list.
            </Text>
          </View>
        ) : null}
        {!loading ? <View className="gap-3">
          {rows.map((row) => {
            const image = mediaUrl(row.image);
            return (
              <Pressable
                key={row.barcode}
                accessibilityRole="button"
                onPress={() => onOpenProduct(row.barcode)}
                className="flex-row gap-3 rounded-3xl bg-paper p-3"
              >
                {image ? (
                  <Image source={{ uri: image }} style={{ width: 72, height: 72, borderRadius: 16 }} />
                ) : (
                  <View className="h-[72px] w-[72px] items-center justify-center rounded-2xl bg-cream">
                    <Text className="text-2xl font-bold text-leaf">{row.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 text-base font-black text-ink">{row.name}</Text>
                    <View className="min-w-[44px] items-center rounded-2xl bg-saffron px-2 py-1">
                      <Text className="text-lg font-black text-ink">{row.quantity}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-mist">{row.barcode}</Text>
                  <Text className="mt-1 text-sm text-ink">{priceSpan(row.selling_from, row.selling_to)}</Text>
                  <Text className="text-xs text-mist">
                    MRP {priceSpan(row.mrp_from, row.mrp_to)}
                    {row.soonest_expiry ? ` · Exp ${prettyDate(row.soonest_expiry)}` : ""}
                  </Text>
                  <Text className="mt-1 text-xs text-mist">
                    {row.locations.map((place) => `${place.name} ${place.quantity}`).join(" · ") || "No stock yet"}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-1">
                    {row.low_stock ? <Text className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Reorder</Text> : null}
                    {row.expiring ? <Text className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">Expiring</Text> : null}
                    {row.bundle_names.length > 0 ? (
                      <Text className="rounded-full bg-cream px-2 py-1 text-xs font-semibold text-leaf">
                        Combo · {row.bundle_names.join(", ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
