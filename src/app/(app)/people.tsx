import { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";

import { createRole, createUser, fetchRoles, fetchUsers } from "@/api/admin";
import { apiError } from "@/api/client";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, COLORS, EmptyState, ErrorState, Field, Page, SectionTitle, Sheet, ShowMore } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";

export default function People() {
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(async () => {
    const [roles, users] = await Promise.all([fetchRoles(), fetchUsers()]);
    return { data: { roles: roles.data, users: users.data } };
  }, []);
  const pages = useShowMore(data?.users ?? []);
  const [sheet, setSheet] = useState<null | "user" | "role">(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      setSheet(null);
      toast(message);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRoleName("");
      void reload();
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const roles = data?.roles ?? [];
  const chosenRole = roleId ?? roles.find((role) => role.slug !== "admin")?.id ?? roles[0]?.id ?? null;

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : <Banner text={error} />}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="Add user" icon="person-add-outline" onPress={() => setSheet("user")} />
        </View>
        <View className="flex-1">
          <Button label="Add role" icon="add" variant="secondary" onPress={() => setSheet("role")} />
        </View>
      </View>
      <SectionTitle title={`Users · ${data?.users.length ?? 0}`} />
      {loading ? (
        <ListSkeleton rows={3} thumb={false} />
      ) : data && data.users.length === 0 ? (
        <EmptyState icon="people-outline" title="No users yet" body="Add staff accounts, then choose what each can do under Staff access." />
      ) : (
        <Card className="overflow-hidden">
          {pages.visible.map((person, index, all) => (
            <View key={person.id} className={`flex-row items-center gap-3 px-4 py-3 ${index < all.length - 1 ? "border-b border-line" : ""}`}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
                <Text className="font-bold text-body">{(person.first_name[0] ?? person.email[0]).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-ink">
                  {person.first_name} {person.last_name}
                </Text>
                <Text className="text-xs text-muted">{person.email}</Text>
              </View>
              <Badge label={person.role.name} tone={person.role.slug === "admin" ? "info" : "neutral"} />
            </View>
          ))}
        </Card>
      )}
      <ShowMore remaining={pages.remaining} onPress={pages.showMore} noun="users" />
      <SectionTitle title="Roles" />
      <View className="flex-row flex-wrap gap-2">
        {roles.map((role) => (
          <Badge key={role.id} label={role.name} />
        ))}
      </View>

      <Sheet visible={sheet === "user"} title="Add user" onClose={() => setSheet(null)}>
        <Banner text={formError} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="First name" value={firstName} onChangeText={setFirstName} />
          </View>
          <View className="flex-1">
            <Field label="Last name" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
        <Field label="Email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Password" icon="lock-closed-outline" revealable hint="At least 8 characters" value={password} onChangeText={setPassword} />
        <Text className="text-sm font-medium text-body">Role</Text>
        <View className="flex-row flex-wrap gap-2">
          {roles.map((role) => (
            <Pressable
              key={role.id}
              accessibilityRole="button"
              onPress={() => setRoleId(role.id)}
              className={`h-10 justify-center rounded-lg border px-3 ${chosenRole === role.id ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
            >
              <Text className={`text-sm font-semibold ${chosenRole === role.id ? "text-brand-dark" : "text-body"}`}>{role.name}</Text>
            </Pressable>
          ))}
        </View>
        <Button
          label="Create user"
          busy={busy}
          disabled={!firstName.trim() || !email.trim() || password.length < 8 || chosenRole === null}
          onPress={() =>
            void run(
              () => createUser({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), password, role_id: chosenRole! }),
              "User created — set their access next",
            )
          }
        />
      </Sheet>

      <Sheet visible={sheet === "role"} title="Add role" onClose={() => setSheet(null)}>
        <Banner text={formError} />
        <Field label="Role name" value={roleName} onChangeText={setRoleName} placeholder="e.g. Cashier" />
        <Button label="Create role" busy={busy} disabled={!roleName.trim()} onPress={() => void run(() => createRole(roleName.trim()), "Role created")} />
      </Sheet>
    </Page>
  );
}
