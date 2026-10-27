import * as Haptics from "expo-haptics";
import { Redirect, router, Stack, useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { apiError, mediaUrl } from "@/api/client";
import { fetchCatalog, fetchPlaces, type Place } from "@/api/pos";
import { useSession } from "@/auth/session";
import { ScannerPane } from "@/components/ScannerPane";
import { ListFooter, ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, COLORS, EmptyState, Icon, IconButton, ListRow, SearchBar, Sheet, Stepper, Thumb } from "@/components/ui";
import { usePaged } from "@/hooks/usePaged";
import { useCart } from "@/pos/cart";
import { taka } from "@/pos/format";

function firstTab(can: (code: string) => boolean, canAny: (...codes: string[]) => boolean) {
  if (can("inventory.view")) return "/inventory" as const;
  if (canAny("accounting.view", "accounting.pay", "accounting.profit", "accounting.lending")) return "/accounts" as const;
  if (can("summary.view")) return "/reports" as const;
  return "/more" as const;
}

export default function Sell() {
  const { can, canAny } = useSession();
  if (!can("sales.sell")) {
    return <Redirect href={firstTab(can, canAny)} />;
  }
  return <Register />;
}

function Register() {
  const cart = useCart();
  const toast = useToast();
  const focused = useIsFocused();
  const [paused, setPaused] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeSheet, setPlaceSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaces()
      .then((response) => {
        setPlaces(response.data);
        if (!cart.location) {
          const shop = response.data.find((place) => place.kind === "shop") ?? response.data[0];
          if (shop) {
            cart.setLocation(shop.name);
          }
        }
      })
      .catch((err) => setError(apiError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onScan(code: string) {
    setLookingUp(true);
    try {
      const response = await fetchCatalog(code, cart.location);
      const product = response.data.products.find((row) => row.barcode === code);
      if (!product) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        toast(`No product registered for ${code}`, "error");
        return;
      }
      if (product.on_hand <= 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        toast(`${product.name} is out of stock at ${cart.location}`, "error");
        return;
      }
      cart.add("product", product.barcode, product.name);
      toast(`Added ${product.name}`);
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setLookingUp(false);
    }
  }

  const total = cart.quote?.total ?? null;

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change selling location"
              onPress={() => setPlaceSheet(true)}
              className="mr-4 h-9 flex-row items-center gap-1.5 rounded-full border border-line bg-canvas px-3"
            >
              <Icon name="storefront-outline" size={16} color={COLORS.body} />
              <Text className="text-sm font-semibold text-ink">{cart.location || "Location"}</Text>
              <Icon name="chevron-down" size={14} color={COLORS.muted} />
            </Pressable>
          ),
        }}
      />

      <View className="gap-3 px-4 pt-3">
        <ScannerPane
          paused={paused}
          active={focused}
          height={190}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onCode={(code) => void onScan(code)}
        />
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search products or combos" />
        <Banner text={error} onDismiss={() => setError(null)} />
      </View>

      {query.trim() ? (
        <SearchResults
          query={query.trim()}
          location={cart.location}
          onPick={(kind, key, name) => {
            cart.add(kind, key, name);
            setQuery("");
            toast(`Added ${name}`);
          }}
        />
      ) : (
        <FlatList
          data={cart.lines}
          keyExtractor={(line) => `${line.kind}:${line.key}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            cart.lines.length > 0 ? (
              <View className="mb-1 flex-row items-center justify-between px-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Current sale · {cart.count} item{cart.count === 1 ? "" : "s"}
                </Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={cart.clear}>
                  <Text className="text-sm font-semibold text-danger">Clear</Text>
                </Pressable>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="barcode-outline"
              title="Scan an item to start"
              body="Point the camera at a barcode or QR code, or search by name."
            />
          }
          renderItem={({ item }) => {
            const price = cart.priceOf(item);
            return (
              <View className="flex-row items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="shrink text-base font-semibold text-ink" numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.kind === "bundle" ? <Badge label="Combo" tone="info" /> : null}
                  </View>
                  <Text className="mt-0.5 text-sm text-muted">
                    {price ? `${taka(price.unit)} each` : cart.quoting ? "Pricing…" : item.kind === "product" ? item.key : ""}
                  </Text>
                </View>
                <Stepper value={item.quantity} onChange={(quantity) => cart.setQuantity(item, quantity)} />
                <Text className="w-20 text-right text-base font-bold text-ink">{price ? taka(price.total) : "—"}</Text>
              </View>
            );
          }}
        />
      )}

      <View className="border-t border-line bg-surface px-4 pb-3 pt-3">
        {cart.quoteError ? (
          <View className="mb-3">
            <Banner text={cart.quoteError} tone="warn" />
          </View>
        ) : null}
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-xs font-medium text-muted">Total · {cart.count} item{cart.count === 1 ? "" : "s"}</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-ink">{total ? taka(total) : "৳0.00"}</Text>
              {cart.quoting || lookingUp ? <ActivityIndicator size="small" color={COLORS.brand} /> : null}
            </View>
          </View>
          <View className="w-40">
            <Button
              label="Charge"
              icon="card-outline"
              size="lg"
              disabled={!cart.quote || cart.quoting || cart.lines.length === 0}
              onPress={() => router.push("/checkout")}
            />
          </View>
        </View>
      </View>

      <Sheet visible={placeSheet} title="Sell from" onClose={() => setPlaceSheet(false)}>
        <View className="overflow-hidden rounded-xl border border-line">
          {places.map((place, index) => (
            <ListRow
              key={place.name}
              title={place.name}
              subtitle={place.kind === "warehouse" ? "Warehouse" : place.kind === "shop" ? "Shop" : "Other"}
              icon={place.kind === "warehouse" ? "business-outline" : "storefront-outline"}
              iconTone={place.name === cart.location ? "brand" : "neutral"}
              last={index === places.length - 1}
              right={place.name === cart.location ? <Icon name="checkmark-circle" size={22} color={COLORS.brand} /> : <View />}
              onPress={() => {
                cart.setLocation(place.name);
                setPlaceSheet(false);
              }}
            />
          ))}
        </View>
        <Text className="text-xs leading-4 text-muted">Stock is drawn from this place, earliest expiry first.</Text>
      </Sheet>
    </View>
  );
}

function SearchResults({
  query,
  location,
  onPick,
}: {
  query: string;
  location: string;
  onPick: (kind: "product" | "bundle", key: string, name: string) => void;
}) {
  const [term, setTerm] = useState(query);
  useEffect(() => {
    const handle = setTimeout(() => setTerm(query), 250);
    return () => clearTimeout(handle);
  }, [query]);

  const list = usePaged(
    (page) => fetchCatalog(term, location, page),
    (response) => [...response.products, ...response.bundles],
    [term, location],
    { refocus: false },
  );
  const rows = list.items;

  if (list.loading || (list.stale && rows.length === 0)) {
    return (
      <View className="p-4">
        <ListSkeleton rows={4} />
      </View>
    );
  }
  if (list.error && rows.length === 0) {
    return (
      <View className="p-4">
        <Banner text={list.error} />
      </View>
    );
  }
  if (rows.length === 0) {
    return (
      <View className="p-4">
        <EmptyState icon="search-outline" title={`No matches for “${term}”`} body="Try another name or barcode, or scan the item." />
      </View>
    );
  }
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => (row.kind === "product" ? `p:${row.barcode}` : `b:${row.name}`)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16 }}
      style={{ opacity: list.stale ? 0.6 : 1 }}
      onEndReached={() => void list.loadMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        list.meta ? (
          <Text className="mb-2 px-1 text-xs text-muted">
            {list.meta.count} product{list.meta.count === 1 ? "" : "s"} found
          </Text>
        ) : undefined
      }
      ListFooterComponent={<ListFooter loading={list.loadingMore} done={!list.hasMore} />}
      renderItem={({ item, index }) => {
        const last = index === rows.length - 1;
        const first = index === 0;
        const shell = `border-x border-line bg-surface ${first ? "rounded-t-xl border-t" : ""} ${last ? "rounded-b-xl border-b" : "border-b"}`;
        if (item.kind === "product") {
          const out = item.on_hand <= 0;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={out}
              onPress={() => onPick("product", item.barcode, item.name)}
              className={`flex-row items-center gap-3 px-3 py-2.5 active:bg-canvas ${shell}`}
            >
              <Thumb uri={mediaUrl(item.image)} name={item.name} size={44} />
              <View className="flex-1">
                <Text className="text-base font-medium text-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-muted">
                  {item.barcode} · {out ? "Out of stock here" : `${item.on_hand} in stock`}
                </Text>
              </View>
              <Text className={`text-base font-semibold ${out ? "text-faint" : "text-ink"}`}>{taka(item.price_from)}</Text>
              <IconButton icon="add" label={`Add ${item.name}`} tone="brand" size={34} onPress={() => onPick("product", item.barcode, item.name)} />
            </Pressable>
          );
        }
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick("bundle", item.name, item.name)}
            className={`flex-row items-center gap-3 px-3 py-2.5 active:bg-canvas ${shell}`}
          >
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-info-soft">
              <Icon name="gift-outline" size={20} color={COLORS.info} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-ink" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-xs text-muted" numberOfLines={1}>
                {item.items.join(", ")}
              </Text>
            </View>
            <Text className="text-base font-semibold text-ink">{taka(item.price)}</Text>
            <IconButton icon="add" label={`Add ${item.name}`} tone="brand" size={34} onPress={() => onPick("bundle", item.name, item.name)} />
          </Pressable>
        );
      }}
    />
  );
}
