import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { fetchCapabilityCatalog, fetchManagerAccess, saveManagerAccess, type Capability, type ManagerAccess } from "@/api/pos";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Banner, Button, Card, COLORS, EmptyState, Page, SectionTitle } from "@/components/ui";

export default function Access() {
  const toast = useToast();
  const [catalog, setCatalog] = useState<Capability[]>([]);
  const [managers, setManagers] = useState<ManagerAccess[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCapabilityCatalog(), fetchManagerAccess()])
      .then(([caps, people]) => {
        setCatalog(caps.data);
        setManagers(people.data);
        if (people.data[0]) {
          setSelected(people.data[0].id);
          setChosen(people.data[0].capabilities);
        }
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const groups = catalog.reduce<Record<string, Capability[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
  const person = managers.find((row) => row.id === selected);
  const dirty = person ? [...person.capabilities].sort().join() !== [...chosen].sort().join() : false;

  async function save() {
    if (selected === null) return;
    setBusy(true);
    setError(null);
    try {
      const response = await saveManagerAccess(selected, chosen);
      setManagers((current) => current.map((row) => (row.id === selected ? { ...row, capabilities: response.data.capabilities } : row)));
      toast("Access saved");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <ListSkeleton rows={4} thumb={false} />
      </Page>
    );
  }

  if (managers.length === 0) {
    return (
      <Page>
        <Banner text={error} />
        <EmptyState icon="people-outline" title="No staff yet" body="Add a user first, then choose what they can do." action={{ label: "Add user", icon: "person-add-outline", onPress: () => router.push("/people") }} />
      </Page>
    );
  }

  return (
    <Page bottomInset={48}>
      <Text className="px-1 text-sm leading-5 text-muted">Staff start with no access. Admins always have every permission.</Text>
      <Banner text={error} />
      <View className="flex-row flex-wrap gap-2">
        {managers.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            onPress={() => {
              setSelected(row.id);
              setChosen(row.capabilities);
            }}
            className={`min-w-[46%] flex-1 rounded-xl border p-3 ${selected === row.id ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
          >
            <Text className="text-base font-semibold text-ink">{row.first_name || row.email}</Text>
            <Text className="text-xs text-muted">
              {row.role} · {row.capabilities.length} permission{row.capabilities.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
        ))}
      </View>
      {Object.entries(groups).map(([group, items]) => (
        <View key={group} className="gap-2">
          <SectionTitle
            title={group}
            action={{
              label: items.every((item) => chosen.includes(item.code)) ? "None" : "All",
              onPress: () =>
                setChosen((current) =>
                  items.every((item) => current.includes(item.code))
                    ? current.filter((code) => !items.some((item) => item.code === code))
                    : [...new Set([...current, ...items.map((item) => item.code)])],
                ),
            }}
          />
          <Card className="overflow-hidden">
            {items.map((item, index) => {
              const on = chosen.includes(item.code);
              return (
                <View key={item.code} className={`flex-row items-center gap-3 px-4 py-3 ${index < items.length - 1 ? "border-b border-line" : ""}`}>
                  <Text className="flex-1 text-sm text-ink">{item.label}</Text>
                  <Switch
                    value={on}
                    onValueChange={() => setChosen((current) => (on ? current.filter((code) => code !== item.code) : [...current, item.code]))}
                    trackColor={{ true: COLORS.brand, false: COLORS.line }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </Card>
        </View>
      ))}
      <Button label={dirty ? "Save access" : "Saved"} size="lg" busy={busy} disabled={!dirty} onPress={() => void save()} />
    </Page>
  );
}
