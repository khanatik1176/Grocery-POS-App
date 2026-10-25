import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { createPlace, deletePlace, fetchPlaces, type Place } from "../api/pos";
import { PageListSkeleton } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";

const KINDS: Place["kind"][] = ["warehouse", "shop", "other"];

export function LocationsScreen({ onBack }: { onBack: () => void }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Place["kind"]>("shop");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    return fetchPlaces()
      .then((response) => setPlaces(response.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await createPlace(name.trim(), kind);
      setName("");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(place: string) {
    setError(null);
    try {
      await deletePlace(place);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Places" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        <Notice text={error} />
        {loading ? <PageListSkeleton rows={4} thumb={false} /> : (
        <>
        <View className="gap-3">
          {places.map((place) => (
            <View key={place.name} className="flex-row items-center justify-between rounded-3xl bg-paper p-4">
              <View>
                <Text className="text-base font-bold text-ink">{place.name}</Text>
                <Text className="text-sm capitalize text-mist">{place.kind}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void remove(place.name)}>
                <Text className="font-semibold text-rose-700">Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View className="mt-4 rounded-3xl bg-paper p-4">
          <Field label="Name" value={name} onChangeText={setName} placeholder="Shop 2" />
          <View className="mb-4 flex-row gap-2">
            {KINDS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setKind(option)}
                className={`rounded-full px-3 py-2 ${kind === option ? "bg-saffron" : "bg-cream"}`}
              >
                <Text className={`capitalize ${kind === option ? "font-semibold text-ink" : "text-ink"}`}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Add place" onPress={() => void add()} busy={busy} />
        </View>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
