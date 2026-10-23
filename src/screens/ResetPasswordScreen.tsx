import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resetPassword } from "../api/auth";
import { apiError } from "../api/client";
import { MudiMark } from "../components/MudiMark";
import { Button, Field } from "../components/ui";

export function ResetPasswordScreen({
  email,
  initialCode,
  onDone,
}: {
  email: string;
  initialCode: string;
  onDone: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    initialCode ? "Development mode included the reset code below." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await resetPassword(email, code.trim(), password);
      setMessage(response.data.detail);
      setTimeout(onDone, 700);
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
          <Text className="mt-4 text-4xl font-black text-cream">Choose a new password</Text>
          <Text className="mt-2 text-base text-cream">{email}</Text>
          <View className="mt-8 rounded-3xl bg-paper p-5">
            <Field label="Reset code" keyboardType="number-pad" value={code} onChangeText={setCode} />
            <Field label="New password" secureTextEntry value={password} onChangeText={setPassword} />
            {message ? <Text className="mb-3 text-sm text-leaf">{message}</Text> : null}
            {error ? <Text className="mb-3 text-sm text-rose-700">{error}</Text> : null}
            <Button
              label="Update password"
              onPress={submit}
              busy={busy}
              disabled={code.length < 6 || password.length < 8}
            />
            <View className="mt-3">
              <Button label="Back to sign in" onPress={onDone} variant="secondary" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
