import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, Switch, Text, View } from "react-native";

import { apiError, mediaUrl } from "@/api/client";
import { createBundle, deleteBundle, fetchBundles, fetchProducts, updateBundle, type Bundle, type ProductRow } from "@/api/pos";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, COLORS, EmptyState, ErrorState, Field, IconButton, Page, SearchBar, Sheet, ShowMore, Stepper, Thumb } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";
import { taka } from "@/pos/format";

type Draft = { original: string | null; name: string; price: string; active: boolean; items: { barcode: string; name: string; quantity: number }[] };

const EMPTY: Draft = { original: null, name: "", price: "", active: true, items: [] };

export default function Combos() {
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fetchBundles, []);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const pages = useShowMore(data ?? []);

  useEffect(() => {
    fetchProducts()
      .then((response) => setProducts(response.data))
      .catch(() => undefined);
  }, []);

  const unitPrice = (barcode: string) => Number(products.find((row) => row.barcode === barcode)?.selling_from ?? 0);
  const worth = (items: { barcode: string; quantity: number }[]) => items.reduce((sum, item) => sum + unitPrice(item.barcode) * item.quantity, 0);

  async function toggle(bundle: Bundle) {
    try {
      await updateBundle(bundle.name, {
        name: bundle.name,
        price: bundle.price,
        active: !bundle.active,
        items: bundle.items.map((item) => ({ barcode: item.barcode, quantity: item.quantity })),
      });
      toast(bundle.active ? `${bundle.name} paused` : `${bundle.name} is on sale`);
      void reload();
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="add" label="New combo" tone="brand" size={36} onPress={() => setDraft(EMPTY)} />,
        }}
      />
      <Text className="px-1 text-sm leading-5 text-muted">
        Combos don’t appear as products. Their products carry a combo marker, and selling a combo reduces each product’s stock.
      </Text>
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : <Banner text={error} />}
      {loading ? <ListSkeleton rows={3} thumb={false} /> : null}
      {!loading && (data ?? []).length === 0 ? (
        <EmptyState icon="gift-outline" title="No combos yet" body="Bundle two or more products at a special price." action={{ label: "Create combo", icon: "add", onPress: () => setDraft(EMPTY) }} />
      ) : null}
      {pages.visible.map((bundle) => {
        const value = worth(bundle.items);
        const saving = value - Number(bundle.price);
        return (
          <Card key={bundle.name} className={`p-4 ${bundle.active ? "" : "opacity-60"}`}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">{bundle.name}</Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-ink">{taka(bundle.price)}</Text>
                  {saving > 0 ? <Badge label={`Saves ${taka(saving)}`} tone="brand" /> : null}
                  {!bundle.active ? <Badge label="Paused" /> : null}
                </View>
              </View>
              <Switch value={bundle.active} onValueChange={() => void toggle(bundle)} trackColor={{ true: COLORS.brand, false: COLORS.line }} thumbColor="#FFFFFF" />
            </View>
            <View className="mt-3 gap-1 rounded-lg bg-canvas p-3">
              {bundle.items.map((item) => (
                <View key={item.barcode} className="flex-row justify-between">
                  <Text className="text-sm text-body">
                    {item.name} × {item.quantity}
                  </Text>
                  <Text className="text-sm text-muted">{unitPrice(item.barcode) ? taka(unitPrice(item.barcode) * item.quantity) : ""}</Text>
                </View>
              ))}
            </View>
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Edit"
                  icon="create-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => setDraft({ original: bundle.name, name: bundle.name, price: bundle.price, active: bundle.active, items: bundle.items.map((item) => ({ ...item })) })}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Delete"
                  icon="trash-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    void deleteBundle(bundle.name)
                      .then(() => {
                        toast(`${bundle.name} deleted`);
                        void reload();
                      })
                      .catch((err) => toast(apiError(err), "error"))
                  }
                />
              </View>
            </View>
          </Card>
        );
      })}
      <ShowMore remaining={pages.remaining} onPress={pages.showMore} noun="combos" />

      {draft ? (
        <ComboSheet
          key={draft.original ?? "new"}
          draft={draft}
        products={products}
        worth={worth}
        onClose={() => setDraft(null)}
          onSaved={(name) => {
            setDraft(null);
            toast(`${name} saved`);
            void reload();
          }}
        />
      ) : null}
    </Page>
  );
}

function ComboSheet({
  draft,
  products,
  worth,
  onClose,
  onSaved,
}: {
  draft: Draft;
  products: ProductRow[];
  worth: (items: { barcode: string; quantity: number }[]) => number;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? products.filter((row) => !form.items.some((item) => item.barcode === row.barcode) && (row.name.toLowerCase().includes(needle) || row.barcode.includes(needle))).slice(0, 6)
    : [];
  const value = worth(form.items);

  async function save() {
    setBusy(true);
    setError(null);
    const payload = { name: form.name.trim(), price: form.price, active: form.active, items: form.items.map(({ barcode, quantity }) => ({ barcode, quantity })) };
    try {
      if (form.original) {
        await updateBundle(form.original, payload);
      } else {
        await createBundle(payload);
      }
      onSaved(payload.name);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible title={form.original ? "Edit combo" : "New combo"} onClose={onClose}>
      <Banner text={error} />
      <Field label="Combo name" value={form.name} editable={!form.original} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="e.g. Breakfast pack" />
      <Field
        label="Combo price"
        value={form.price}
        onChangeText={(price) => setForm((current) => ({ ...current, price }))}
        keyboardType="decimal-pad"
        suffix="৳"
        hint={value > 0 ? `Items sell for ${taka(value)} separately${Number(form.price) > 0 ? ` · customer saves ${taka(value - Number(form.price))}` : ""}` : undefined}
      />
      <Text className="text-sm font-medium text-body">Products ({form.items.length})</Text>
      {form.items.map((item) => (
        <View key={item.barcode} className="flex-row items-center gap-3 rounded-lg border border-line p-2.5">
          <View className="flex-1">
            <Text className="text-sm font-medium text-ink">{item.name}</Text>
            <Text className="text-xs text-muted">{item.barcode}</Text>
          </View>
          <Stepper
            value={item.quantity}
            onChange={(quantity) =>
              setForm((current) => ({
                ...current,
                items: current.items.map((row) => (row.barcode === item.barcode ? { ...row, quantity } : row)).filter((row) => row.quantity > 0),
              }))
            }
          />
        </View>
      ))}
      <SearchBar value={query} onChangeText={setQuery} placeholder="Add a product…" />
      {matches.map((row) => (
        <Pressable
          key={row.barcode}
          accessibilityRole="button"
          onPress={() => {
            setForm((current) => ({ ...current, items: [...current.items, { barcode: row.barcode, name: row.name, quantity: 1 }] }));
            setQuery("");
          }}
          className="flex-row items-center gap-3 rounded-lg border border-line p-2.5 active:bg-canvas"
        >
          <Thumb uri={mediaUrl(row.image)} name={row.name} size={36} />
          <View className="flex-1">
            <Text className="text-sm font-medium text-ink">{row.name}</Text>
            <Text className="text-xs text-muted">{taka(row.selling_from)}</Text>
          </View>
          <IconButton icon="add" label={`Add ${row.name}`} tone="brand" size={30} onPress={() => setForm((current) => ({ ...current, items: [...current.items, { barcode: row.barcode, name: row.name, quantity: 1 }] }))} />
        </Pressable>
      ))}
      <Button label="Save combo" busy={busy} disabled={!form.name.trim() || !(Number(form.price) > 0) || form.items.length < 2} onPress={() => void save()} />
      {form.items.length < 2 ? <Text className="text-center text-xs text-muted">A combo needs at least two different products.</Text> : null}
    </Sheet>
  );
}
