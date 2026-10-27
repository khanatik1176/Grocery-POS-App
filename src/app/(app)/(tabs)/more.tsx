import { router, type Href } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { useSession } from "@/auth/session";
import { Card, Page, SectionTitle, ListRow, Sheet, Button, type IconName } from "@/components/ui";

type Item = { title: string; subtitle: string; icon: IconName; href: Href };

export default function More() {
  const { user, can, signOut } = useSession();
  const [confirm, setConfirm] = useState(false);
  const admin = user?.role.slug === "admin";

  const store: Item[] = [
    can("inventory.locations") ? { title: "Warehouses & shops", subtitle: "Where stock is kept and sold", icon: "business-outline" as IconName, href: "/places" as Href } : null,
    can("inventory.bundles") ? { title: "Combos", subtitle: "Bundle offers built from products", icon: "gift-outline" as IconName, href: "/combos" as Href } : null,
    can("inventory.preorder") ? { title: "Pre-order alerts", subtitle: "Default reorder and expiry warnings", icon: "notifications-outline" as IconName, href: "/alerts" as Href } : null,
    can("store.settings") ? { title: "Store settings", subtitle: "Wallets, receipts, SMS and email", icon: "settings-outline" as IconName, href: "/settings" as Href } : null,
  ].filter((item) => item !== null);

  const people: Item[] = admin
    ? [
        { title: "Staff access", subtitle: "Turn each job on or off per manager", icon: "shield-checkmark-outline", href: "/access" },
        { title: "Users & roles", subtitle: "Add staff accounts", icon: "people-outline", href: "/people" },
      ]
    : [];

  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || (user?.email[0] ?? "?").toUpperCase();

  return (
    <Page>
      <Card className="flex-row items-center gap-3 p-4">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand">
          <Text className="text-lg font-bold text-white">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">
            {user?.first_name} {user?.last_name}
          </Text>
          <Text className="text-sm text-muted">{user?.email}</Text>
        </View>
        <View className="rounded-md bg-brand-soft px-2 py-1">
          <Text className="text-xs font-semibold text-brand-dark">{user?.role.name}</Text>
        </View>
      </Card>

      {store.length > 0 ? (
        <>
          <SectionTitle title="Store" />
          <Card className="overflow-hidden">
            {store.map((item, index) => (
              <ListRow key={item.title} {...item} iconTone="brand" last={index === store.length - 1} onPress={() => router.push(item.href)} />
            ))}
          </Card>
        </>
      ) : null}

      {people.length > 0 ? (
        <>
          <SectionTitle title="People" />
          <Card className="overflow-hidden">
            {people.map((item, index) => (
              <ListRow key={item.title} {...item} iconTone="info" last={index === people.length - 1} onPress={() => router.push(item.href)} />
            ))}
          </Card>
        </>
      ) : null}

      {!admin && (user?.capabilities ?? []).length === 0 ? (
        <Card className="p-4">
          <Text className="text-base font-semibold text-ink">Waiting for access</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">An admin needs to turn on the parts of the register you will use.</Text>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <ListRow title="Sign out" icon="log-out-outline" danger last onPress={() => setConfirm(true)} right={<View />} />
      </Card>

      <Sheet visible={confirm} title="Sign out?" onClose={() => setConfirm(false)}>
        <Text className="text-sm text-body">Any items in the current sale will be cleared.</Text>
        <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirm(false)} />
      </Sheet>
    </Page>
  );
}
