import { router } from "expo-router";
import { useState } from "react";

import { requestPasswordReset } from "@/api/auth";
import { apiError } from "@/api/client";
import { AuthShell } from "@/components/AuthShell";
import { Banner, Button, Field } from "@/components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await requestPasswordReset(email.trim());
      router.replace({ pathname: "/reset-password", params: { email: email.trim(), code: response.data.reset_code ?? "" } });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll send a 6-digit code to the email on your account.">
      <Banner text={error} />
      <Field
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => void submit()}
      />
      <Button label="Send code" onPress={() => void submit()} busy={busy} disabled={!email} />
      <Button label="Back to sign in" variant="ghost" size="sm" onPress={() => router.back()} />
    </AuthShell>
  );
}
