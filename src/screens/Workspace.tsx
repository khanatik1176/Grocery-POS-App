import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchMe } from "../api/auth";
import type { SessionUser } from "../api/types";
import { MudiMark } from "../components/MudiMark";
import { HomeSkeleton } from "../components/skeleton";
import { Button } from "../components/ui";
import { can } from "../pos/access";
import { AccessScreen } from "./AccessScreen";
import { AccountingScreen } from "./AccountingScreen";
import { BundlesScreen } from "./BundlesScreen";
import { InventoryScreen } from "./InventoryScreen";
import { LocationsScreen } from "./LocationsScreen";
import { PreorderScreen } from "./PreorderScreen";
import { ProductScreen } from "./ProductScreen";
import { ReceiveScreen } from "./ReceiveScreen";
import { SalesScreen } from "./SalesScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SummaryScreen } from "./SummaryScreen";

type Route =
  | { name: "home" }
  | { name: "inventory" }
  | { name: "receive" }
  | { name: "product"; barcode: string }
  | { name: "locations" }
  | { name: "bundles" }
  | { name: "preorder" }
  | { name: "settings" }
  | { name: "sales" }
  | { name: "accounting" }
  | { name: "summary" }
  | { name: "access" };

export function Workspace({
  user,
  onUser,
  onSignOut,
  onOpenPeople,
}: {
  user: SessionUser;
  onUser: (user: SessionUser) => void;
  onSignOut: () => void;
  onOpenPeople: () => void;
}) {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route.name !== "home") {
      return;
    }
    let active = true;
    setLoading(true);
    fetchMe()
      .then((response) => {
        if (active) {
          onUser(response.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [route.name, onUser]);

  if (route.name === "inventory") {
    return (
      <InventoryScreen
        user={user}
        onBack={() => setRoute({ name: "home" })}
        onOpenProduct={(barcode) => setRoute({ name: "product", barcode })}
        onReceive={() => setRoute({ name: "receive" })}
        onLocations={() => setRoute({ name: "locations" })}
        onBundles={() => setRoute({ name: "bundles" })}
        onPreorder={() => setRoute({ name: "preorder" })}
      />
    );
  }
  if (route.name === "receive") {
    return <ReceiveScreen onBack={() => setRoute({ name: "home" })} onSaved={(barcode) => setRoute({ name: "product", barcode })} />;
  }
  if (route.name === "product") {
    return (
      <ProductScreen
        user={user}
        barcode={route.barcode}
        onBack={() => setRoute(can(user, "inventory.view") ? { name: "inventory" } : { name: "home" })}
      />
    );
  }
  if (route.name === "locations") {
    return <LocationsScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "bundles") {
    return <BundlesScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "preorder") {
    return <PreorderScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "settings") {
    return <SettingsScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "sales") {
    return <SalesScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "accounting") {
    return <AccountingScreen user={user} onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "summary") {
    return <SummaryScreen onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "access") {
    return <AccessScreen onBack={() => setRoute({ name: "home" })} onOpenPeople={onOpenPeople} />;
  }

  const cards = [
    can(user, "inventory.view") || can(user, "inventory.receive") || can(user, "inventory.locations") || can(user, "inventory.bundles") || can(user, "inventory.preorder")
      ? {
          title: "Inventory",
          detail: "Products, batches, and combos",
          onPress: () =>
            setRoute(
              can(user, "inventory.view")
                ? { name: "inventory" }
                : can(user, "inventory.receive")
                  ? { name: "receive" }
                  : can(user, "inventory.locations")
                    ? { name: "locations" }
                    : can(user, "inventory.bundles")
                      ? { name: "bundles" }
                      : { name: "preorder" },
            ),
        }
      : null,
    can(user, "sales.sell")
      ? { title: "Sales", detail: "Scanner stays on until you pause it", onPress: () => setRoute({ name: "sales" }) }
      : null,
    can(user, "accounting.view") || can(user, "accounting.pay") || can(user, "accounting.profit") || can(user, "accounting.lending")
      ? { title: "Accounting", detail: "Vendors, profit, and lending", onPress: () => setRoute({ name: "accounting" }) }
      : null,
    can(user, "summary.view")
      ? { title: "Summary", detail: "Ranges and items to buy", onPress: () => setRoute({ name: "summary" }) }
      : null,
    can(user, "store.settings")
      ? { title: "Settings", detail: "Wallets, SMS, and email", onPress: () => setRoute({ name: "settings" }) }
      : null,
    user.role.slug === "admin"
      ? { title: "Access", detail: "Assign each job to a manager", onPress: () => setRoute({ name: "access" }) }
      : null,
  ].filter((card): card is { title: string; detail: string; onPress: () => void } => card !== null);

  const featured = cards.find((card) => card.title === "Sales");
  const rest = cards.filter((card) => card.title !== "Sales");

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="px-5 py-6">
        <View className="flex-row items-center justify-between">
          <MudiMark />
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-saffron">{user.role.name}</Text>
        </View>
        <Text className="mt-8 text-4xl font-black leading-tight text-cream">
          {user.first_name || "Hello"},{"\n"}the counter is open.
        </Text>
        {loading ? (
          <View className="mt-6">
            <HomeSkeleton />
          </View>
        ) : cards.length === 0 ? (
          <View className="mt-6 overflow-hidden rounded-[28px] bg-paper">
            <View className="h-2 bg-saffron" />
            <View className="p-5">
              <Text className="text-lg font-black text-ink">Nothing is open yet</Text>
              <Text className="mt-2 text-base leading-6 text-mist">
                An admin has to assign each part of the register before you can use it.
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-6">
            {featured ? (
              <Pressable accessibilityRole="button" onPress={featured.onPress} className="rounded-[28px] bg-saffron p-5">
                <Text className="text-xs font-semibold uppercase tracking-[3px] text-ink">Scan first</Text>
                <Text className="mt-2 text-3xl font-black text-ink">Open sales</Text>
                <Text className="mt-1 text-base text-ink">{featured.detail}</Text>
              </Pressable>
            ) : null}
            {rest.length > 0 ? (
              <View className={`${featured ? "mt-4" : ""} overflow-hidden rounded-[28px] bg-paper`}>
                {rest.map((card, index) => (
                  <Pressable
                    key={card.title}
                    accessibilityRole="button"
                    onPress={card.onPress}
                    className={`flex-row items-center px-4 py-4 ${index > 0 ? "border-t border-cream" : ""}`}
                  >
                    <Text className="w-10 font-black text-saffron">{String(index + 1).padStart(2, "0")}</Text>
                    <View className="flex-1">
                      <Text className="text-lg font-black text-ink">{card.title}</Text>
                      <Text className="text-sm text-mist">{card.detail}</Text>
                    </View>
                    <Text className="text-lg text-ink">→</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
        <View className="mt-6">
          <Button label="Sign out" onPress={onSignOut} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
