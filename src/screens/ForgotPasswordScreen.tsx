import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestPasswordReset } from "../api/auth";
import { apiError } from "../api/client";
import { MudiMark } from "../components/MudiMark";
import { Bone, SkeletonGroup } from "../components/skeleton";
import { Button, Field } from "../components/ui";

export function ForgotPasswordScreen({
  onBack,
  onCodeSent,
}: {
  onBack: () => void;
  onCodeSent: (email: string, code: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await requestPasswordReset(email.trim());
      onCodeSent(email.trim(), response.data.reset_code ?? "");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <MudiMark />
          <Text className="mt-4 text-4xl font-black text-cream">Reset password</Text>
          <Text className="mt-2 text-base text-cream">
            We will send a 6-digit code to the account email.
          </Text>
          <View className="mt-8 rounded-3xl bg-paper p-5">
            {busy ? (
              <SkeletonGroup>
                <Bone height={10} width="22%" tone="light" />
                <View className="mt-2">
                  <Bone height={48} radius={16} tone="light" />
                </View>
                <View className="mt-4">
                  <Bone height={48} radius={24} tone="light" />
                </View>
              </SkeletonGroup>
            ) : (
              <>
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text className="mb-3 text-sm text-rose-700">{error}</Text> : null}
            <Button label="Send code" onPress={submit} busy={busy} disabled={!email} />
            <View className="mt-3">
              <Button label="Back to sign in" onPress={onBack} variant="secondary" />
            </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
