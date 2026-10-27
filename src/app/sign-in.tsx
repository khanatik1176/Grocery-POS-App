import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { AuthShell } from "@/components/AuthShell";
import { Banner, Button, Field } from "@/components/ui";

const DEMO = [
  { role: "Admin", email: "admin@grocerypos.app", password: "PosAdmin!2026" },
  { role: "Manager", email: "manager@grocerypos.app", password: "PosManager!2026" },
];

export default function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to Mudi"
      subtitle="Point-of-sale for your grocery counter"
      footer={
        __DEV__ ? (
          <View className="mt-6 gap-2">
            <Text className="text-center text-xs font-semibold uppercase tracking-wider text-muted">Demo accounts</Text>
            <View className="flex-row gap-2">
              {DEMO.map((account) => (
                <Pressable
                  key={account.email}
                  accessibilityRole="button"
                  onPress={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 active:bg-canvas"
                >
                  <Text className="text-sm font-semibold text-ink">{account.role}</Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {account.email}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null
      }
    >
      <Banner text={error} />
      <Field
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@store.com"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label="Password"
        icon="lock-closed-outline"
        revealable
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
      />
      <Button label="Sign in" onPress={() => void submit()} busy={busy} disabled={!email || !password} />
      <Button label="Forgot password?" variant="ghost" size="sm" onPress={() => router.push("/forgot-password")} />
    </AuthShell>
  );
}
