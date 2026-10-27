import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "./BrandMark";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
          <View className="items-center">
            <BrandMark size={56} />
            <Text className="mt-4 text-2xl font-bold text-ink">{title}</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-muted">{subtitle}</Text>
          </View>
          <View className="mt-8 gap-4 rounded-2xl border border-line bg-surface p-5">{children}</View>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
