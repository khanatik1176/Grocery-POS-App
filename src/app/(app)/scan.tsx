import { isAxiosError } from "axios";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiError } from "@/api/client";
import { fetchProduct } from "@/api/pos";
import { useSession } from "@/auth/session";
import { ScannerPane } from "@/components/ScannerPane";
import { useToast } from "@/components/toast";
import { IconButton } from "@/components/ui";

/** Scan-first lookup: a known code opens the product, a new code starts receiving it. */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = useSession();
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onCode(code: string) {
    if (busy) {
      return;
    }
    setBusy(true);
    setPaused(true);
    try {
      await fetchProduct(code);
      router.replace({ pathname: "/product/[barcode]", params: { barcode: code } });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        if (can("inventory.receive")) {
          toast("New code — add it to inventory", "info");
          router.replace({ pathname: "/receive", params: { barcode: code } });
        } else {
          toast(`No product registered for ${code}`, "error");
          setPaused(false);
        }
      } else {
        toast(apiError(err), "error");
        setPaused(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1 bg-black">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-semibold text-white">Scan product</Text>
        <IconButton icon="close" label="Close scanner" tone="dark" onPress={() => router.back()} />
      </View>
      <View className="flex-1 justify-center px-4">
        <ScannerPane
          paused={paused}
          height={420}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onCode={(code) => void onCode(code)}
          hint="Known items open; new codes go to Receive"
        />
        {busy ? (
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator color="#FFFFFF" />
            <Text className="text-sm text-white">Looking up…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
