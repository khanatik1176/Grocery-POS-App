import { isAxiosError } from "axios";
import * as ImagePicker from "expo-image-picker";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

import { apiError, mediaUrl } from "@/api/client";
import { fetchPlaces, fetchProduct, fetchVendors, receiveStock, type Place, type ProductDetail, type Vendor } from "@/api/pos";
import { DateField } from "@/components/DateField";
import { ScannerPane } from "@/components/ScannerPane";
import { FormSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, Chip, ChipRow, COLORS, Field, Icon, Page, SectionTitle, Stepper, Thumb } from "@/components/ui";
import { addDays, taka, todayIso } from "@/pos/format";

type Lookup = { state: "idle" } | { state: "loading" } | { state: "found"; product: ProductDetail } | { state: "new" };

export default function Receive() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const toast = useToast();
  const focused = useIsFocused();
  const [paused, setPaused] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });

  const [barcode, setBarcode] = useState(params.barcode ?? "");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [manufacturing, setManufacturing] = useState(todayIso());
  const [expiry, setExpiry] = useState(addDays(todayIso(), 180));
  const [mrp, setMrp] = useState("");
  const [purchase, setPurchase] = useState("");
  const [discount, setDiscount] = useState("0");
  const [origin, setOrigin] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchPlaces(), fetchVendors().catch(() => ({ data: [] as Vendor[] }))])
      .then(([placeResponse, vendorResponse]) => {
        setPlaces(placeResponse.data);
        setVendors(vendorResponse.data);
        const preferred = placeResponse.data.find((place) => place.kind === "warehouse") ?? placeResponse.data[0];
        setLocation((current) => current || preferred?.name || "");
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
    if (params.barcode) {
      void identify(params.barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function identify(raw: string) {
    const code = raw.trim();
    if (!code) {
      return;
    }
    setBarcode(code);
    setPaused(true);
    setLookup({ state: "loading" });
    try {
      const product = (await fetchProduct(code)).data;
      setLookup({ state: "found", product });
      setName(product.name);
      const last = product.last_receipt;
      if (last) {
        setMrp(last.mrp);
        setPurchase(last.purchase_rate);
        setDiscount(String(Number(last.discount_rate)));
        setOrigin(last.origin);
        setLocation(last.location);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setLookup({ state: "new" });
        setName("");
      } else {
        setLookup({ state: "idle" });
        setError(apiError(err));
      }
    }
  }

  function reset() {
    setBarcode("");
    setName("");
    setQuantity(1);
    setImage(null);
    setLookup({ state: "idle" });
    setPaused(false);
    setError(null);
  }

  async function choosePhoto(fromCamera: boolean) {
    const permission = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo access was not allowed.");
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { base64: true, quality: 0.4, allowsEditing: true, aspect: [1, 1] };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (asset?.base64) {
      setImage({ uri: asset.uri, base64: asset.base64 });
      setError(null);
    }
  }

  const mrpValue = Number(mrp);
  const costValue = Number(purchase);
  const discountValue = Number(discount || 0);
  const selling = Number.isFinite(mrpValue) && mrpValue > 0 ? mrpValue * (1 - discountValue / 100) : null;
  const margin = selling !== null && Number.isFinite(costValue) && costValue > 0 ? selling - costValue : null;

  const problems = [
    !barcode.trim() && "Scan or enter a barcode.",
    !name.trim() && "Enter the product name.",
    !(mrpValue > 0) && "Enter the MRP.",
    !(costValue >= 0 && purchase !== "") && "Enter the purchase rate.",
    !origin.trim() && "Enter where it was bought.",
    expiry < manufacturing && "Expiry cannot be before manufacturing.",
  ].filter(Boolean) as string[];

  async function save(another: boolean) {
    if (problems.length > 0) {
      setError(problems[0]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await receiveStock({
        barcode: barcode.trim(),
        name: name.trim(),
        quantity,
        manufacturing_date: manufacturing,
        expiry_date: expiry,
        mrp: mrpValue.toFixed(2),
        purchase_rate: costValue.toFixed(2),
        discount_rate: discountValue.toFixed(2),
        origin: origin.trim(),
        location,
        image_base64: image?.base64 ?? "",
      });
      toast(`Received ${quantity} × ${response.data.name}`);
      if (another) {
        reset();
      } else {
        router.replace({ pathname: "/product/[barcode]", params: { barcode: response.data.barcode } });
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <FormSkeleton fields={6} />
      </Page>
    );
  }

  const vendorMatches = vendors.filter((vendor) => vendor.name !== origin && vendor.name.toLowerCase().includes(origin.trim().toLowerCase())).slice(0, 6);

  return (
    <Page bottomInset={48}>
      {lookup.state === "idle" ? (
        <>
          <ScannerPane
            paused={paused}
            active={focused}
            height={210}
            onPause={() => setPaused(true)}
            onResume={() => setPaused(false)}
            onCode={(code) => void identify(code)}
          />
          <Card className="gap-3 p-4">
            <Text className="text-sm font-medium text-body">No barcode? Type it in</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Field placeholder="Barcode or QR text" icon="barcode-outline" autoCapitalize="none" value={barcode} onChangeText={setBarcode} onSubmitEditing={() => void identify(barcode)} />
              </View>
              <Button label="Look up" onPress={() => void identify(barcode)} disabled={!barcode.trim()} />
            </View>
          </Card>
        </>
      ) : (
        <Card className="flex-row items-center gap-3 p-3">
          {lookup.state === "loading" ? (
            <ActivityIndicator color={COLORS.brand} />
          ) : (
            <Thumb uri={image?.uri ?? (lookup.state === "found" ? mediaUrl(lookup.product.image) : null)} name={name || "?"} size={48} />
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink" numberOfLines={1}>
              {lookup.state === "loading" ? "Looking up…" : name || "New product"}
            </Text>
            <Text className="text-xs text-muted">{barcode}</Text>
            <View className="mt-1 flex-row">
              {lookup.state === "found" ? (
                <Badge label={`Existing · ${lookup.product.quantity} in stock`} tone="brand" />
              ) : lookup.state === "new" ? (
                <Badge label="New to inventory" tone="info" icon="sparkles-outline" />
              ) : null}
            </View>
          </View>
          <Button label="Rescan" icon="scan" variant="secondary" size="sm" onPress={reset} />
        </Card>
      )}

      <Banner text={error} onDismiss={() => setError(null)} />

      {lookup.state === "found" || lookup.state === "new" ? (
        <>
          {lookup.state === "found" && lookup.product.last_receipt ? (
            <Banner tone="info" text="Prices, source, and place are filled in from the last delivery. Change anything that differs — a different date, price, or source becomes its own batch." />
          ) : null}

          <SectionTitle title="Product" />
          <Card className="gap-3 p-4">
            <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Pran Mango Juice 250ml" />
            <View className="flex-row items-center gap-3">
              {image ? <Image source={{ uri: image.uri }} style={{ width: 48, height: 48, borderRadius: 8 }} /> : null}
              <View className="flex-1">
                <Button label={image ? "Retake photo" : "Take photo"} icon="camera-outline" variant="secondary" size="sm" onPress={() => void choosePhoto(true)} />
              </View>
              <View className="flex-1">
                <Button label="From gallery" icon="images-outline" variant="secondary" size="sm" onPress={() => void choosePhoto(false)} />
              </View>
            </View>
          </Card>

          <SectionTitle title="Batch" />
          <Card className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-body">Quantity received</Text>
              <View className="flex-row items-center gap-2">
                <Stepper value={quantity} min={1} onChange={setQuantity} />
                <View className="w-20">
                  <Field value={String(quantity)} onChangeText={(value) => setQuantity(Math.max(1, Number(value.replace(/\D/g, "")) || 1))} keyboardType="number-pad" />
                </View>
              </View>
            </View>
            <View className="flex-row gap-3">
              <DateField label="Manufactured" value={manufacturing} onChange={setManufacturing} maximumDate={new Date()} />
              <DateField label="Expires" value={expiry} onChange={setExpiry} />
            </View>
          </Card>

          <SectionTitle title="Pricing" />
          <Card className="gap-3 p-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="MRP" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" placeholder="0.00" suffix="৳" />
              </View>
              <View className="flex-1">
                <Field label="Purchase rate" value={purchase} onChangeText={setPurchase} keyboardType="decimal-pad" placeholder="0.00" suffix="৳" />
              </View>
            </View>
            <Field label="Discount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" suffix="%" />
            <View className="flex-row rounded-lg bg-canvas">
              <View className="flex-1 p-3">
                <Text className="text-xs text-muted">Selling price</Text>
                <Text className="text-lg font-bold text-ink">{selling !== null ? taka(selling) : "—"}</Text>
              </View>
              <View className="flex-1 border-l border-line p-3">
                <Text className="text-xs text-muted">Margin per unit</Text>
                <Text className={`text-lg font-bold ${margin !== null && margin < 0 ? "text-danger" : "text-brand-dark"}`}>
                  {margin !== null ? `${taka(margin)}${selling ? ` · ${Math.round((margin / selling) * 100)}%` : ""}` : "—"}
                </Text>
              </View>
            </View>
          </Card>

          <SectionTitle title="Source & place" />
          <Card className="gap-3 p-4">
            <Field label="Bought from (vendor)" icon="person-outline" value={origin} onChangeText={setOrigin} placeholder="e.g. Agora Wholesale" />
            {vendorMatches.length > 0 ? (
              <ChipRow>
                {vendorMatches.map((vendor) => (
                  <Chip key={vendor.name} label={vendor.name} icon="person-outline" onPress={() => setOrigin(vendor.name)} />
                ))}
              </ChipRow>
            ) : null}
            <Text className="text-sm font-medium text-body">Store in</Text>
            <View className="flex-row flex-wrap gap-2">
              {places.map((place) => (
                <Pressable
                  key={place.name}
                  accessibilityRole="button"
                  onPress={() => setLocation(place.name)}
                  className={`h-11 flex-row items-center gap-2 rounded-lg border px-3 ${location === place.name ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
                >
                  <Icon name={place.kind === "warehouse" ? "business-outline" : "storefront-outline"} size={16} color={location === place.name ? COLORS.brandDark : COLORS.muted} />
                  <Text className={`text-sm font-semibold ${location === place.name ? "text-brand-dark" : "text-body"}`}>{place.name}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <View className="gap-2">
            <Button label={`Save ${quantity} to ${location || "inventory"}`} icon="checkmark" size="lg" busy={busy} onPress={() => void save(false)} />
            <Button label="Save & scan next" icon="scan-outline" variant="secondary" disabled={busy} onPress={() => void save(true)} />
          </View>
        </>
      ) : null}
    </Page>
  );
}
