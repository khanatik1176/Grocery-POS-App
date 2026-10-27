import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { resetPassword } from "@/api/auth";
import { apiError } from "@/api/client";
import { AuthShell } from "@/components/AuthShell";
import { Banner, Button, Field } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ email: string; code?: string }>();
  const toast = useToast();
  const [code, setCode] = useState(params.code ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await resetPassword(params.email ?? "", code.trim(), password);
      toast(response.data.detail);
      router.replace("/sign-in");
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle={params.email ?? ""}>
      {params.code ? <Banner tone="info" text="Development mode filled in the reset code for you." /> : null}
      <Banner text={error} />
      <Field label="Reset code" icon="key-outline" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
      <Field label="New password" icon="lock-closed-outline" revealable hint="At least 8 characters" value={password} onChangeText={setPassword} />
      <Button label="Update password" onPress={() => void submit()} busy={busy} disabled={code.length < 6 || password.length < 8} />
      <Button label="Back to sign in" variant="ghost" size="sm" onPress={() => router.replace("/sign-in")} />
    </AuthShell>
  );
}
