import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createRole, createUser, fetchRoles, fetchUsers } from "../api/admin";
import { apiError } from "../api/client";
import type { Role, SessionUser } from "../api/types";
import { PageFormSkeleton } from "../components/skeleton";
import { Button, Field } from "../components/ui";

export function AdminPanel({
  onBack,
  onSignOut,
}: {
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [roleName, setRoleName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [roleResponse, userResponse] = await Promise.all([fetchRoles(), fetchUsers()]);
    setRoles(roleResponse.data);
    setUsers(userResponse.data);
    setRoleId((current) => current ?? roleResponse.data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((err: unknown) => {
        if (active) {
          setError(apiError(err));
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
  }, [load]);

  async function addRole() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createRole(roleName.trim());
      setRoleName("");
      setMessage("Role added.");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function addUser() {
    if (roleId == null) {
      setError("Choose a role first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createUser({
        first_name: firstName.trim(),
        email: email.trim(),
        password,
        role_id: roleId,
      });
      setFirstName("");
      setEmail("");
      setPassword("");
      setMessage("User added.");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="px-6 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-sm font-semibold uppercase tracking-wide text-saffron">Admin panel</Text>
        <Text className="mt-2 text-3xl font-black text-cream">Roles and users</Text>
        {loading ? (
          <View className="mt-6 gap-4">
            <PageFormSkeleton fields={1} />
            <PageFormSkeleton fields={4} />
          </View>
        ) : (
        <>
        <View className="mt-6 rounded-3xl bg-paper p-5">
          <Text className="mb-3 text-lg font-semibold text-ink">Add a role</Text>
          <Field label="Role name" value={roleName} onChangeText={setRoleName} />
          <Button label="Save role" onPress={addRole} busy={busy} disabled={!roleName.trim()} />
          <View className="mt-4 gap-2">
            {roles.map((role) => (
              <Text key={role.id} className="text-sm text-ink">
                {role.name}
              </Text>
            ))}
          </View>
        </View>
        <View className="mt-4 rounded-3xl bg-paper p-5">
          <Text className="mb-3 text-lg font-semibold text-ink">Add a user</Text>
          <Field label="First name" value={firstName} onChangeText={setFirstName} />
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Text className="mb-2 text-sm font-medium text-ink">Role</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {roles.map((role) => {
              const selected = role.id === roleId;
              return (
                <Pressable
                  key={role.id}
                  onPress={() => setRoleId(role.id)}
                  className={`rounded-full px-3 py-2 ${selected ? "bg-saffron" : "bg-cream"}`}
                >
                  <Text className="text-sm font-semibold text-ink">
                    {role.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {message ? <Text className="mb-3 text-sm text-leaf">{message}</Text> : null}
          {error ? <Text className="mb-3 text-sm text-rose-700">{error}</Text> : null}
          <Button
            label="Save user"
            onPress={addUser}
            busy={busy}
            disabled={!firstName.trim() || !email.trim() || password.length < 8}
          />
          <View className="mt-4 gap-2">
            {users.map((person) => (
              <Text key={person.id} className="text-sm text-ink">
                {person.first_name} {person.last_name} · {person.email} · {person.role.name}
              </Text>
            ))}
          </View>
        </View>
        </>
        )}
        <View className="mt-4 gap-3">
          <Button label="Back to dashboard" onPress={onBack} variant="secondary" />
          <Button label="Sign out" onPress={onSignOut} variant="danger" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
