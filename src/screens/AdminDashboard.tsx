import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchRoles, fetchUsers } from "../api/admin";
import type { SessionUser } from "../api/types";
import { Bone, SkeletonGroup } from "../components/skeleton";
import { Button } from "../components/ui";

export function AdminDashboard({
  user,
  onOpenPanel,
  onSignOut,
}: {
  user: SessionUser;
  onOpenPanel: () => void;
  onSignOut: () => void;
}) {
  const [roleCount, setRoleCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchRoles(), fetchUsers()])
      .then(([roles, users]) => {
        if (!active) {
          return;
        }
        setRoleCount(roles.data.length);
        setUserCount(users.data.length);
      })
      .catch(() => {
        if (active) {
          setRoleCount(null);
          setUserCount(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="px-6 py-6">
        <Text className="text-sm font-semibold uppercase tracking-wide text-saffron">Admin dashboard</Text>
        <Text className="mt-2 text-3xl font-bold text-white">
          Hello, {user.first_name || "Admin"}
        </Text>
        <Text className="mt-2 text-base text-cream">
          This dashboard and the admin panel are visible only to the admin role.
        </Text>
        {loading ? (
          <SkeletonGroup>
            <View className="mt-6 flex-row gap-3">
              <View className="flex-1">
                <Bone height={92} radius={16} />
              </View>
              <View className="flex-1">
                <Bone height={92} radius={16} />
              </View>
            </View>
          </SkeletonGroup>
        ) : (
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-paper p-4">
            <Text className="text-sm text-mist">Roles</Text>
            <Text className="mt-1 text-3xl font-bold text-ink">{roleCount ?? "—"}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-paper p-4">
            <Text className="text-sm text-mist">Users</Text>
            <Text className="mt-1 text-3xl font-bold text-ink">{userCount ?? "—"}</Text>
          </View>
        </View>
        )}
        <View className="mt-6 gap-3">
          <Button label="Open admin panel" onPress={onOpenPanel} />
          <Button label="Sign out" onPress={onSignOut} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
