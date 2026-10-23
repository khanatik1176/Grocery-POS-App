import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SessionUser } from "../api/types";
import { Button } from "../components/ui";

export function ManagerHome({
  user,
  onSignOut,
}: {
  user: SessionUser;
  onSignOut: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
        <Text className="text-sm font-semibold uppercase tracking-wide text-saffron">Manager</Text>
        <Text className="mt-2 text-3xl font-bold text-white">
          Hello, {user.first_name || "Manager"}
        </Text>
        <View className="mt-6 rounded-3xl bg-paper p-5">
          <Text className="text-lg font-semibold text-ink">Store floor</Text>
          <Text className="mt-2 text-base leading-6 text-ink">
            You are signed in as a manager. The admin dashboard and admin panel stay hidden for this role.
          </Text>
        </View>
        <View className="mt-6">
          <Button label="Sign out" onPress={onSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
