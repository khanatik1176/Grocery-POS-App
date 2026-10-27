import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { apiError, mediaUrl } from "@/api/client";
import { fetchPlaces, fetchProduct, fetchProducts, transferStock, type Place, type ProductDetail, type ProductRow } from "@/api/pos";
import { DetailSkeleton, ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, COLORS, EmptyState, Icon, Page, SearchBar, SectionTitle, ShowMore, Stepper, Thumb } from "@/components/ui";
import { useShowMore } from "@/hooks/usePaged";

export default function Transfer() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const toast = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ProductRow[] | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pages = useShowMore(matches ?? []);
  const [from, setFrom] = useState("");
  const [chosenTo, setTo] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPlaces()
      .then((response) => setPlaces(response.data))
      .catch((err) => setError(apiError(err)));
    if (params.barcode) {
      void pick(params.barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (product) {
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      fetchProducts(query.trim())
        .then((response) => {
          if (!active) return;
          setMatches(response.data.filter((row) => row.quantity > 0));
          setSearched(query.trim());
        })
        .catch((err) => active && setError(apiError(err)));
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, product]);

  async function pick(barcode: string) {
    setPicking(true);
    try {
      const detail = (await fetchProduct(barcode)).data;
      setProduct(detail);
      const source = [...detail.locations].sort((a, b) => b.quantity - a.quantity)[0];
      setFrom(source?.name ?? "");
      setTo("");
      setQuantity(1);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setPicking(false);
    }
  }

  const available = product?.locations.find((spot) => spot.name === from)?.quantity ?? 0;
  const targets = places.filter((place) => place.name !== from);
  const to = targets.some((place) => place.name === chosenTo) ? chosenTo : ((targets.find((place) => place.kind === "shop") ?? targets[0])?.name ?? "");

  async function submit() {
    if (!product) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await transferStock({ barcode: product.barcode, from_location: from, to_location: to, quantity });
      toast(`Moved ${quantity} × ${product.name} to ${to}`);
      router.back();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (picking && !product) {
    return (
      <Page>
        <DetailSkeleton />
      </Page>
    );
  }

  if (!product) {
    const searching = matches !== null && searched !== query.trim();
    return (
      <Page>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Find a product to move" />
        <Banner text={error} />
        {matches === null ? (
          <ListSkeleton rows={4} />
        ) : matches.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title={query.trim() ? "No matching products in stock" : "No products in stock"}
            body="Only products with stock can be transferred."
          />
        ) : (
          <Card className={`overflow-hidden ${searching ? "opacity-60" : ""}`}>
            {pages.visible.map((row, index, all) => (
              <Pressable
                key={row.barcode}
                accessibilityRole="button"
                onPress={() => void pick(row.barcode)}
                className={`flex-row items-center gap-3 px-3 py-2.5 active:bg-canvas ${index < all.length - 1 ? "border-b border-line" : ""}`}
              >
                <Thumb uri={mediaUrl(row.image)} name={row.name} size={40} />
                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{row.name}</Text>
                  <Text className="text-xs text-muted">{row.locations.map((spot) => `${spot.name} ${spot.quantity}`).join(" · ")}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={COLORS.faint} />
              </Pressable>
            ))}
          </Card>
        )}
        <ShowMore remaining={pages.remaining} onPress={pages.showMore} noun="products" />
      </Page>
    );
  }

  return (
    <Page>
      <Card className="flex-row items-center gap-3 p-3">
        <Thumb uri={mediaUrl(product.image)} name={product.name} size={48} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">{product.name}</Text>
          <Text className="text-xs text-muted">{product.barcode}</Text>
        </View>
        {!params.barcode ? <Button label="Change" variant="secondary" size="sm" onPress={() => setProduct(null)} /> : null}
      </Card>
      <Banner text={error} onDismiss={() => setError(null)} />

      <SectionTitle title="From" />
      <View className="flex-row flex-wrap gap-2">
        {product.locations.map((spot) => (
          <PlaceTile
            key={spot.name}
            name={spot.name}
            detail={`${spot.quantity} available`}
            selected={from === spot.name}
            disabled={spot.quantity === 0}
            onPress={() => {
              setFrom(spot.name);
              setQuantity(1);
            }}
          />
        ))}
      </View>

      <View className="items-center">
        <Icon name="arrow-down-circle" size={28} color={COLORS.brand} />
      </View>

      <SectionTitle title="To" />
      <View className="flex-row flex-wrap gap-2">
        {targets.map((place) => (
          <PlaceTile key={place.name} name={place.name} detail={place.kind} selected={to === place.name} onPress={() => setTo(place.name)} />
        ))}
      </View>

      <SectionTitle title="Quantity" />
      <Card className="flex-row items-center justify-between p-4">
        <View>
          <Text className="text-3xl font-bold text-ink">{quantity}</Text>
          <Text className="text-xs text-muted">of {available} at {from || "—"}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Button label="All" size="sm" variant="secondary" disabled={available === 0} onPress={() => setQuantity(available)} />
          <Stepper value={quantity} min={1} onChange={(value) => setQuantity(Math.min(Math.max(1, value), Math.max(1, available)))} />
        </View>
      </Card>
      <Text className="px-1 text-xs leading-4 text-muted">Earliest-expiring batches move first. Each batch keeps its dates, prices, and source.</Text>

      <Button
        label={`Move ${quantity} to ${to || "…"}`}
        icon="swap-horizontal"
        size="lg"
        busy={busy}
        disabled={!from || !to || quantity < 1 || quantity > available}
        onPress={() => void submit()}
      />
    </Page>
  );
}

function PlaceTile({ name, detail, selected, disabled = false, onPress }: { name: string; detail: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-w-[46%] flex-1 rounded-xl border p-3 ${selected ? "border-brand bg-brand-soft" : "border-line bg-surface"} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-base font-semibold ${selected ? "text-brand-dark" : "text-ink"}`}>{name}</Text>
      <Text className="text-xs capitalize text-muted">{detail}</Text>
    </Pressable>
  );
}
