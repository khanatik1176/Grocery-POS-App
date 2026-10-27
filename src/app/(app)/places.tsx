import { useState } from "react";
import { RefreshControl, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { createPlace, deletePlace, fetchPlaces, type Place } from "@/api/pos";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, COLORS, EmptyState, ErrorState, Field, IconButton, ListRow, Page, SectionTitle, Segmented, ShowMore } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";

const KINDS: { value: Place["kind"]; label: string }[] = [
  { value: "warehouse", label: "Warehouse" },
  { value: "shop", label: "Shop" },
  { value: "other", label: "Other" },
];

export default function Places() {
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fetchPlaces, []);
  const pages = useShowMore(data ?? []);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Place["kind"]>("shop");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setFormError(null);
    try {
      await createPlace(name.trim(), kind);
      toast(`${name.trim()} added`);
      setName("");
      void reload();
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : <Banner text={error} />}
      <SectionTitle title="Locations" />
      {loading ? (
        <ListSkeleton rows={2} thumb={false} />
      ) : data && data.length === 0 ? (
        <EmptyState icon="business-outline" title="No locations yet" body="Add your warehouse and each shop below so stock can be kept and sold from them." />
      ) : (
        <Card className="overflow-hidden">
          {pages.visible.map((place, index, all) => (
            <ListRow
              key={place.name}
              title={place.name}
              subtitle={KINDS.find((option) => option.value === place.kind)?.label}
              icon={place.kind === "warehouse" ? "business-outline" : place.kind === "shop" ? "storefront-outline" : "location-outline"}
              iconTone="brand"
              last={index === all.length - 1}
              right={
                <IconButton
                  icon="trash-outline"
                  label={`Remove ${place.name}`}
                  tone="danger"
                  size={32}
                  onPress={() =>
                    void deletePlace(place.name)
                      .then(() => {
                        toast(`${place.name} removed`);
                        void reload();
                      })
                      .catch((err) => toast(apiError(err), "error"))
                  }
                />
              }
            />
          ))}
        </Card>
      )}
      <ShowMore remaining={pages.remaining} onPress={pages.showMore} noun="locations" />
      <Text className="px-1 text-xs leading-4 text-muted">A place with stock or sales history can’t be removed.</Text>

      <SectionTitle title="Add a location" />
      <Card className="gap-3 p-4">
        <Banner text={formError} />
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Shop 2 – Dhanmondi" />
        <Segmented options={KINDS} value={kind} onChange={setKind} />
        <View>
          <Button label="Add location" icon="add" busy={busy} disabled={!name.trim()} onPress={() => void add()} />
        </View>
      </Card>
    </Page>
  );
}
