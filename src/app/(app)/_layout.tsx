import { Stack } from "expo-router";

import { COLORS } from "@/components/ui";
import { CartProvider } from "@/pos/cart";

export default function AppLayout() {
  return (
    <CartProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "600", fontSize: 17 },
          headerShadowVisible: true,
          contentStyle: { backgroundColor: COLORS.canvas },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[barcode]" options={{ title: "Product" }} />
        <Stack.Screen name="receive" options={{ title: "Receive stock" }} />
        <Stack.Screen name="transfer" options={{ title: "Transfer stock", presentation: "modal" }} />
        <Stack.Screen name="scan" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout", gestureEnabled: false }} />
        <Stack.Screen name="vendor/[name]" options={{ title: "Vendor ledger" }} />
        <Stack.Screen name="sale/[number]" options={{ title: "Sale" }} />
        <Stack.Screen name="places" options={{ title: "Warehouses & shops" }} />
        <Stack.Screen name="combos" options={{ title: "Combos" }} />
        <Stack.Screen name="alerts" options={{ title: "Pre-order alerts" }} />
        <Stack.Screen name="settings" options={{ title: "Store settings" }} />
        <Stack.Screen name="access" options={{ title: "Staff access" }} />
        <Stack.Screen name="people" options={{ title: "Users & roles" }} />
      </Stack>
    </CartProvider>
  );
}
