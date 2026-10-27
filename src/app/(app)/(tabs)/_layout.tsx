import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { useSession } from "@/auth/session";
import { COLORS } from "@/components/ui";
import { useCart } from "@/pos/cart";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IconName, idle: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : idle} size={23} color={color as string} />;
  };
}

export default function TabsLayout() {
  const { canAny, can } = useSession();
  const { count } = useCart();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { borderTopColor: COLORS.line, backgroundColor: COLORS.surface },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { fontWeight: "700", fontSize: 18, color: COLORS.ink },
        headerTitleAlign: "left",
        headerShadowVisible: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sell",
          tabBarIcon: tabIcon("scan-circle", "scan-circle-outline"),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.brand, fontSize: 10 },
          href: can("sales.sell") ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: tabIcon("cube", "cube-outline"),
          href: can("inventory.view") ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: tabIcon("wallet", "wallet-outline"),
          href: canAny("accounting.view", "accounting.pay", "accounting.profit", "accounting.lending") ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: tabIcon("stats-chart", "stats-chart-outline"),
          href: can("summary.view") ? undefined : null,
        }}
      />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("grid", "grid-outline") }} />
    </Tabs>
  );
}
