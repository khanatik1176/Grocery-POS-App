import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { createBundle, deleteBundle, fetchBundles, type Bundle } from "../api/pos";
import { Button, Field, Notice, TopBar } from "../components/ui";
import { taka } from "../pos/format";

export function BundlesScreen({ onBack }: { onBack: () => void }) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState([
    { barcode: "", quantity: "1" },
    { barcode: "", quantity: "1" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    return fetchBundles()
      .then((response) => setBundles(response.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await createBundle({
        name: name.trim(),
        price,
        items: items
          .filter((item) => item.barcode.trim())
          .map((item) => ({ barcode: item.barcode.trim(), quantity: Number(item.quantity) })),
      });
      setName("");
      setPrice("");
      setItems([
        { barcode: "", quantity: "1" },
        { barcode: "", quantity: "1" },
      ]);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Combos" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        <Text className="mb-3 text-sm leading-5 text-cream">
          Combos stay off the product list. Each included product shows a combo marker, and a combo sale reduces those products.
        </Text>
        <Notice text={error} />
        <View className="gap-3">
          {bundles.map((bundle) => (
            <View key={bundle.name} className="rounded-3xl bg-paper p-4">
              <View className="flex-row items-start justify-between">
                <Text className="flex-1 text-base font-bold text-ink">{bundle.name}</Text>
                <Text className="font-semibold text-leaf">{taka(bundle.price)}</Text>
              </View>
              {bundle.items.map((item) => (
                <Text key={item.barcode} className="mt-1 text-sm text-mist">
                  {item.name} × {item.quantity}
                </Text>
              ))}
              <Pressable
                accessibilityRole="button"
                className="mt-3"
                onPress={() => {
                  void deleteBundle(bundle.name)
                    .then(load)
                    .catch((err) => setError(apiError(err)));
                }}
              >
                <Text className="font-semibold text-rose-700">Remove combo</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View className="mt-4 rounded-3xl bg-paper p-4">
          <Field label="Combo name" value={name} onChangeText={setName} />
          <Field label="Combo price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          {items.map((item, index) => (
            <View key={index} className="flex-row gap-2">
              <View className="flex-1">
                <Field
                  label={`Product ${index + 1} barcode`}
                  value={item.barcode}
                  autoCapitalize="none"
                  onChangeText={(value) =>
                    setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, barcode: value } : row)))
                  }
                />
              </View>
              <View className="w-20">
                <Field
                  label="Qty"
                  value={item.quantity}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: value } : row)))
                  }
                />
              </View>
            </View>
          ))}
          <Button
            label="Add another product"
            variant="secondary"
            onPress={() => setItems((current) => [...current, { barcode: "", quantity: "1" }])}
          />
          <View className="mt-3">
            <Button label="Save combo" onPress={() => void save()} busy={busy} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
