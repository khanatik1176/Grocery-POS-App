import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import { fetchCapabilityCatalog, fetchManagerAccess, saveManagerAccess, type Capability, type ManagerAccess } from "../api/pos";
import { PageListSkeleton, StatBlockSkeleton } from "../components/skeleton";
import { Button, Notice, TopBar } from "../components/ui";

export function AccessScreen({ onBack, onOpenPeople }: { onBack: () => void; onOpenPeople: () => void }) {
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
        const first = people.data[0];
        if (first) {
          setSelected(first.id);
          setChosen(first.capabilities);
        }
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const groups = catalog.reduce<Record<string, Capability[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  function select(person: ManagerAccess) {
    setSelected(person.id);
    setChosen(person.capabilities);
  }

  function toggle(code: string) {
    setChosen((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function save() {
    if (selected === null) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await saveManagerAccess(selected, chosen);
      setManagers((current) =>
        current.map((person) => (person.id === selected ? { ...person, capabilities: response.data.capabilities } : person)),
      );
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Access" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12">
        <Text className="mb-3 text-sm leading-5 text-cream">
          A manager can do nothing until you turn on each job. Admin keeps every job.
        </Text>
        <Notice text={error} />
        <Button label="Roles and users" variant="secondary" onPress={onOpenPeople} />
        {loading ? (
          <View className="mt-4 gap-3">
            <PageListSkeleton rows={2} thumb={false} />
            <StatBlockSkeleton />
          </View>
        ) : (
        <>
        <View className="mt-4 gap-2">
          {managers.map((person) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              onPress={() => select(person)}
              className={`rounded-2xl px-4 py-3 ${selected === person.id ? "bg-paper" : "bg-bark"}`}
            >
              <Text className={`font-semibold ${selected === person.id ? "text-ink" : "text-cream"}`}>
                {person.first_name || person.email}
              </Text>
              <Text className={`text-sm ${selected === person.id ? "text-mist" : "text-cream"}`}>
                {person.role} · {person.capabilities.length} assigned
              </Text>
            </Pressable>
          ))}
        </View>
        {selected !== null ? (
          <View className="mt-4 rounded-3xl bg-paper p-4">
            {Object.entries(groups).map(([group, items]) => (
              <View key={group} className="mb-3">
                <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-mist">{group}</Text>
                {items.map((item) => {
                  const on = chosen.includes(item.code);
                  return (
                    <Pressable
                      key={item.code}
                      accessibilityRole="button"
                      onPress={() => toggle(item.code)}
                      className="mb-2 flex-row items-center justify-between rounded-2xl bg-cream px-3 py-3"
                    >
                      <Text className="flex-1 pr-3 text-sm text-ink">{item.label}</Text>
                      <Text className={`font-semibold ${on ? "text-leaf" : "text-slate-400"}`}>{on ? "On" : "Off"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Button label="Save access" onPress={() => void save()} busy={busy} />
          </View>
        ) : null}
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
