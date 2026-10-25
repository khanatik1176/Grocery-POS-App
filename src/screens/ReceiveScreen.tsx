import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { fetchPlaces, fetchProduct, receiveStock, type Place } from "../api/pos";
import { ScannerPane } from "../components/ScannerPane";
import { Bone, PageFormSkeleton, SkeletonGroup } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";
import { isIsoDate } from "../pos/format";

export function ReceiveScreen({
  initialBarcode = "",
  onBack,
  onSaved,
}: {
  initialBarcode?: string;
  onBack: () => void;
  onSaved: (barcode: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [manufacturing, setManufacturing] = useState("");
  const [expiry, setExpiry] = useState("");
  const [mrp, setMrp] = useState("");
  const [purchase, setPurchase] = useState("");
  const [discount, setDiscount] = useState("0");
  const [origin, setOrigin] = useState("");
  const [location, setLocation] = useState("Shop");
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces()
      .then((response) => {
        setPlaces(response.data);
        if (response.data[0] && !response.data.some((place) => place.name === "Shop")) {
          setLocation(response.data[0].name);
        }
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function lookup(code: string) {
    if (!code.trim()) {
      return;
    }
    try {
      const response = await fetchProduct(code.trim());
      setName(response.data.name);
    } catch {
      // A new barcode still needs a name before it can be saved.
    }
  }

  async function choosePhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo access was not allowed.");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4 });
    if (!result.canceled && result.assets[0]?.base64) {
      setImage(result.assets[0].base64);
      setError(null);
    }
  }

  async function save() {
    if (!isIsoDate(manufacturing) || !isIsoDate(expiry)) {
      setError("Use dates like 2026-10-23.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await receiveStock({
        barcode: barcode.trim(),
        name: name.trim(),
        quantity: Number(quantity),
        manufacturing_date: manufacturing,
        expiry_date: expiry,
        mrp,
        purchase_rate: purchase,
        discount_rate: discount || "0",
        origin: origin.trim(),
        location,
        image_base64: image,
      });
      onSaved(response.data.barcode);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Add stock" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        {loading ? (
          <View className="gap-3">
            <SkeletonGroup>
              <Bone height={220} radius={24} />
            </SkeletonGroup>
            <PageFormSkeleton fields={6} />
          </View>
        ) : (
        <>
        <ScannerPane
          paused={paused}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onCode={(code) => {
            setBarcode(code);
            void lookup(code);
          }}
        />
        <Text className="mb-4 mt-2 text-sm text-cream">
          The same barcode with the same dates, prices, and source adds to that batch. A different date, price, or source stays with the same product on the list.
        </Text>
        <View className="rounded-3xl bg-paper p-4">
          <Notice text={error} />
          <Field label="Barcode or QR" value={barcode} onChangeText={setBarcode} onBlur={() => void lookup(barcode)} autoCapitalize="none" />
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          <Field label="Manufacturing date" value={manufacturing} onChangeText={setManufacturing} placeholder="2026-10-01" autoCapitalize="none" />
          <Field label="Expiry date" value={expiry} onChangeText={setExpiry} placeholder="2027-10-01" autoCapitalize="none" />
          <Field label="MRP" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" placeholder="100.00" />
          <Field label="Purchase rate" value={purchase} onChangeText={setPurchase} keyboardType="decimal-pad" placeholder="70.00" />
          <Field label="Discount rate %" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
          <Field label="Source of purchase" value={origin} onChangeText={setOrigin} placeholder="Agora" />
          <Text className="mb-2 text-sm font-medium text-ink">Place</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {places.map((place) => (
              <Pressable
                key={place.name}
                accessibilityRole="button"
                onPress={() => setLocation(place.name)}
                className={`rounded-full px-3 py-2 ${location === place.name ? "bg-saffron" : "bg-cream"}`}
              >
                <Text className="font-semibold text-ink">{place.name}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mb-4 flex-row gap-2">
            <View className="flex-1">
              <Button label={image ? "Photo added" : "Take photo"} onPress={() => void choosePhoto(true)} variant="secondary" />
            </View>
            <View className="flex-1">
              <Button label="Choose photo" onPress={() => void choosePhoto(false)} variant="secondary" />
            </View>
          </View>
          <Button label="Save batch" onPress={() => void save()} busy={busy} />
        </View>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
