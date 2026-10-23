import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { login } from "../api/auth";
import type { SessionUser } from "../api/types";
import { saveToken } from "../auth/storage";
import { MudiMark } from "../components/MudiMark";
import { Button, Field } from "../components/ui";

export function LoginScreen({
  onSignedIn,
  onForgot,
}: {
  onSignedIn: (user: SessionUser) => void;
  onForgot: () => void;
}) {
  const [email, setEmail] = useState("admin@grocerypos.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await login(email.trim(), password);
      await saveToken(response.data.token);
      onSignedIn(response.data.user);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3">
            <MudiMark />
            <Text className="text-xs font-semibold uppercase tracking-[3px] text-saffron">Neighborhood register</Text>
          </View>
          <Text className="mt-5 text-6xl font-black text-cream">Mudi</Text>
          <Text className="mt-2 max-w-xs text-base leading-6 text-mist">
            The counter for the mudi shop. Scan the shelf, take the money, keep the stock.
          </Text>
          <View className="mt-8 overflow-hidden rounded-[28px] bg-paper">
            <View className="h-2 bg-saffron" />
            <View className="p-5">
              <Field
                label="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Password"
                revealable
                value={password}
                onChangeText={setPassword}
              />
              {error ? <Text className="mb-3 text-sm text-clay">{error}</Text> : null}
              <Button label="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
              <View className="mt-3">
                <Button label="Forgot password" onPress={onForgot} variant="secondary" />
              </View>
            </View>
            <View className="border-t border-dashed border-mist bg-cream px-5 py-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-mist">Counter keys</Text>
              <Text className="mt-2 text-xs leading-5 text-ink">
                Admin · admin@grocerypos.app · PosAdmin!2026{"\n"}
                Manager · manager@grocerypos.app · PosManager!2026
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
