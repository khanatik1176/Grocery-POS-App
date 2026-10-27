import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { mediaUrl } from "@/api/client";
import { fetchPlaces, fetchProductPage, type Place, type ProductRow } from "@/api/pos";
import { useSession } from "@/auth/session";
import { ListFooter, ListSkeleton } from "@/components/skeleton";
import { Badge, Banner, Chip, ChipRow, COLORS, EmptyState, ErrorState, Icon, IconButton, SearchBar, Thumb, type IconName } from "@/components/ui";
import { usePaged } from "@/hooks/usePaged";
import { prettyDate, priceSpan } from "@/pos/format";

type Filter = "all" | "low" | "expiring" | "combo";

export default function Inventory() {
  const { can } = useSession();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [place, setPlace] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    fetchPlaces()
      .then((response) => setPlaces(response.data))
      .catch(() => undefined);
  }, []);

  const list = usePaged(
    (page) => fetchProductPage({ q: debounced, filter: filter === "all" ? "" : filter, location: place ?? "", page }),
    (response) => response.results,
    [debounced, filter, place],
  );
  const counts = list.meta?.counts ?? { all: 0, low: 0, expiring: 0, combo: 0 };
  const filtered = debounced !== "" || filter !== "all" || place !== null;

  const actions = [
    can("inventory.receive") ? { label: "Receive", icon: "download-outline" as IconName, onPress: () => router.push("/receive") } : null,
    can("inventory.transfer") ? { label: "Transfer", icon: "swap-horizontal-outline" as IconName, onPress: () => router.push("/transfer") } : null,
    can("inventory.bundles") ? { label: "Combos", icon: "gift-outline" as IconName, onPress: () => router.push("/combos") } : null,
    can("inventory.locations") ? { label: "Places", icon: "business-outline" as IconName, onPress: () => router.push("/places") } : null,
    can("inventory.preorder") ? { label: "Alerts", icon: "notifications-outline" as IconName, onPress: () => router.push("/alerts") } : null,
  ].filter((action) => action !== null);

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen
        options={{
          headerRight: () =>
            can("inventory.receive") ? (
              <View className="mr-4">
                <IconButton icon="add" label="Receive stock" tone="brand" size={36} onPress={() => router.push("/receive")} />
              </View>
            ) : null,
        }}
      />
      <FlatList
        data={list.loading ? [] : list.items}
        keyExtractor={(row) => row.barcode}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
        onEndReached={() => void list.loadMore()}
        onEndReachedThreshold={0.4}
        style={{ opacity: list.stale && !list.loading ? 0.6 : 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 8 }}
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or barcode" onScan={() => router.push("/scan")} />
            {actions.length > 0 ? (
              <View className="flex-row gap-2">
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    onPress={action.onPress}
                    className="flex-1 items-center gap-1 rounded-xl border border-line bg-surface py-2.5 active:bg-canvas"
                  >
                    <Icon name={action.icon} size={20} color={COLORS.brandDark} />
                    <Text className="text-xs font-medium text-body">{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ChipRow>
              <Chip label="All" count={counts.all} selected={filter === "all"} onPress={() => setFilter("all")} />
              <Chip label="Low stock" icon="trending-down" count={counts.low} selected={filter === "low"} onPress={() => setFilter("low")} />
              <Chip label="Expiring" icon="time-outline" count={counts.expiring} selected={filter === "expiring"} onPress={() => setFilter("expiring")} />
              <Chip label="In combos" icon="gift-outline" count={counts.combo} selected={filter === "combo"} onPress={() => setFilter("combo")} />
            </ChipRow>
            {places.length > 1 ? (
              <ChipRow>
                <Chip label="All places" icon="layers-outline" selected={place === null} onPress={() => setPlace(null)} />
                {places.map((spot) => (
                  <Chip
                    key={spot.name}
                    label={spot.name}
                    icon={spot.kind === "warehouse" ? "business-outline" : "storefront-outline"}
                    selected={place === spot.name}
                    onPress={() => setPlace(spot.name)}
                  />
                ))}
              </ChipRow>
            ) : null}
            {list.items.length > 0 ? <Banner text={list.error} /> : null}
            {list.loading ? <ListSkeleton rows={6} /> : null}
            {list.meta && !list.loading && list.items.length > 0 ? (
              <Text className="px-1 text-xs text-muted">
                Showing {list.items.length} of {list.meta.count} product{list.meta.count === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? undefined : list.error ? (
            <ErrorState message={list.error} onRetry={() => void list.reload()} />
          ) : !filtered ? (
            <EmptyState
              icon="cube-outline"
              title="No products yet"
              body="Scan a barcode or QR code to register your first product and its batch."
              action={can("inventory.receive") ? { label: "Receive stock", icon: "scan", onPress: () => router.push("/receive") } : undefined}
            />
          ) : (
            <EmptyState icon="search-outline" title="Nothing matches" body="Try another search or filter." />
          )
        }
        ListFooterComponent={
          list.items.length > 0 ? <ListFooter loading={list.loadingMore} done={!list.hasMore && !list.stale} label="You’ve reached the end of the list" /> : undefined
        }
        renderItem={({ item }) => <ProductCard row={item} place={place} />}
      />
    </View>
  );
}

function ProductCard({ row, place }: { row: ProductRow; place: string | null }) {
  const quantity = place ? (row.locations.find((spot) => spot.name === place)?.quantity ?? 0) : row.quantity;
  const tone = quantity === 0 ? "danger" : row.low_stock ? "warn" : "brand";
  const qtyColor = { danger: COLORS.danger, warn: COLORS.warn, brand: COLORS.ink }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/product/[barcode]", params: { barcode: row.barcode } })}
      className="flex-row gap-3 rounded-xl border border-line bg-surface p-3 active:bg-canvas"
    >
      <Thumb uri={mediaUrl(row.image)} name={row.name} size={56} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {row.name}
        </Text>
        <Text className="text-xs text-muted">{row.barcode}</Text>
        <Text className="mt-1 text-sm font-medium text-body">{priceSpan(row.selling_from, row.selling_to)}</Text>
        <View className="mt-1.5 flex-row flex-wrap gap-1">
          {quantity === 0 ? <Badge label="Out of stock" tone="danger" /> : row.low_stock ? <Badge label="Reorder" tone="warn" icon="trending-down" /> : null}
          {row.expiring ? <Badge label={`Exp ${prettyDate(row.soonest_expiry)}`} tone="danger" icon="time-outline" /> : null}
          {row.bundle_names.length > 0 ? <Badge label={row.bundle_names.length === 1 ? "In combo" : `In ${row.bundle_names.length} combos`} tone="info" icon="gift-outline" /> : null}
        </View>
      </View>
      <View className="items-end">
        <Text style={{ color: qtyColor }} className="text-2xl font-bold">
          {quantity}
        </Text>
        <Text className="text-xs text-muted">{place ? `at ${place}` : "in stock"}</Text>
        {!place && row.locations.length > 1 ? (
          <Text className="mt-1 text-right text-[11px] text-faint">{row.locations.map((spot) => `${spot.name} ${spot.quantity}`).join("\n")}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
