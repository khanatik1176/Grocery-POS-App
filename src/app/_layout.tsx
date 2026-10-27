import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider, useSession } from "@/auth/session";
import { BrandMark } from "@/components/BrandMark";
import { SkeletonGroup, Bone } from "@/components/skeleton";
import { ToastProvider } from "@/components/toast";

function Boot() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <BrandMark size={56} />
      <View className="mt-6 w-40">
        <SkeletonGroup>
          <Bone height={8} radius={4} />
        </SkeletonGroup>
      </View>
    </View>
  );
}

function Navigator() {
  const { status } = useSession();
  if (status === "loading") {
    return <Boot />;
  }
  const signedIn = status === "signed-in";
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4F6F8" } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Navigator />
        </ToastProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
