import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import {
  collectLoan,
  createLoan,
  fetchAccounting,
  payVendor,
  removePartner,
  savePartner,
  type Accounting,
} from "../api/pos";
import type { SessionUser } from "../api/types";
import { StatBlockSkeleton } from "../components/skeleton";
import { Button, Field, Notice, TopBar } from "../components/ui";
import { can } from "../pos/access";
import { isIsoDate, prettyDate, taka } from "../pos/format";

export function AccountingScreen({ user, onBack }: { user: SessionUser; onBack: () => void }) {
  const [data, setData] = useState<Accounting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [partner, setPartner] = useState("");
  const [share, setShare] = useState("");
  const [borrower, setBorrower] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [opened, setOpened] = useState("");
  const [due, setDue] = useState("");
  const [collect, setCollect] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    return fetchAccounting()
      .then((response) => setData(response.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Accounting" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
        <Notice text={error} />
        {loading ? <StatBlockSkeleton /> : null}
        {!loading && data?.today ? (
          <View className="mb-3 rounded-3xl bg-paper p-4">
            <Text className="text-sm text-mist">Today</Text>
            <Text className="mt-1 text-2xl font-bold text-ink">{taka(data.today.sales_total)}</Text>
            <Text className="text-base text-ink">
              {data.today.count} sales · Profit {taka(data.today.profit)}
            </Text>
          </View>
        ) : null}
        {!loading && data?.vendors ? (
          <View className="mb-3 rounded-3xl bg-paper p-4">
            <Text className="text-lg font-bold text-ink">Vendors</Text>
            {data.vendors.length === 0 ? <Text className="mt-2 text-mist">No purchases yet.</Text> : null}
            {data.vendors.map((row) => (
              <View key={row.name} className="mt-3 border-t border-cream pt-3">
                <Text className="font-semibold text-ink">{row.name}</Text>
                <Text className="text-sm text-mist">
                  Bought {taka(row.purchased)} · Paid {taka(row.paid)} · Due {taka(row.balance)}
                </Text>
              </View>
            ))}
            {can(user, "accounting.pay") ? (
              <View className="mt-4">
                <Field label="Vendor" value={vendor} onChangeText={setVendor} />
                <Field label="Amount" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" />
                <Field label="Paid on" value={paidOn} onChangeText={setPaidOn} placeholder="2026-10-23" autoCapitalize="none" />
                <Button
                  label="Record payment"
                  busy={busy}
                  onPress={() => {
                    if (!isIsoDate(paidOn)) {
                      setError("Use a date like 2026-10-23.");
                      return;
                    }
                    void run(() => payVendor({ vendor, amount: payAmount, paid_on: paidOn }));
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        {!loading && data?.partners ? (
          <View className="mb-3 rounded-3xl bg-paper p-4">
            <Text className="text-lg font-bold text-ink">Profit sharing</Text>
            {data.partners.shares.map((row) => (
              <View key={row.name} className="mt-3 flex-row items-center justify-between">
                <Text className="text-ink">
                  {row.name} {row.share}% · {taka(row.amount)}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => void run(() => removePartner(row.name))}>
                  <Text className="font-semibold text-rose-700">Remove</Text>
                </Pressable>
              </View>
            ))}
            <Text className="mt-2 text-sm text-mist">
              Shop keeps {data.partners.shop_share}% · {taka(data.partners.shop_amount)}
            </Text>
            <View className="mt-3">
              <Field label="Partner" value={partner} onChangeText={setPartner} />
              <Field label="Share %" value={share} onChangeText={setShare} keyboardType="decimal-pad" />
              <Button label="Save share" busy={busy} onPress={() => void run(() => savePartner(partner, share))} />
            </View>
          </View>
        ) : null}
        {!loading && data?.loans ? (
          <View className="rounded-3xl bg-paper p-4">
            <Text className="text-lg font-bold text-ink">Lending to collect</Text>
            {data.loans.length === 0 ? <Text className="mt-2 text-mist">Nothing is outstanding.</Text> : null}
            {data.loans.map((loan) => (
              <View key={loan.id} className="mt-3 border-t border-cream pt-3">
                <Text className="font-semibold text-ink">{loan.borrower}</Text>
                <Text className="text-sm text-mist">
                  {taka(loan.outstanding)} left of {taka(loan.amount)} · due {prettyDate(loan.due_on)}
                  {loan.overdue ? " · overdue" : ""}
                </Text>
                {loan.note ? <Text className="text-sm text-mist">{loan.note}</Text> : null}
                {Number(loan.outstanding) > 0 ? (
                  <View className="mt-2 flex-row items-end gap-2">
                    <View className="flex-1">
                      <Field
                        label="Collected"
                        value={collect[loan.id] ?? ""}
                        onChangeText={(value) => setCollect((current) => ({ ...current, [loan.id]: value }))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View className="mb-3">
                      <Button
                        label="Collect"
                        onPress={() => void run(() => collectLoan(loan.id, collect[loan.id] ?? ""))}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
            <View className="mt-4">
              <Field label="Borrower" value={borrower} onChangeText={setBorrower} />
              <Field label="Amount lent" value={loanAmount} onChangeText={setLoanAmount} keyboardType="decimal-pad" />
              <Field label="Opened" value={opened} onChangeText={setOpened} placeholder="2026-10-01" autoCapitalize="none" />
              <Field label="Due" value={due} onChangeText={setDue} placeholder="2026-11-01" autoCapitalize="none" />
              <Button
                label="Add lending"
                busy={busy}
                onPress={() => {
                  if (!isIsoDate(opened) || !isIsoDate(due)) {
                    setError("Use dates like 2026-10-23.");
                    return;
                  }
                  void run(() => createLoan({ borrower, amount: loanAmount, opened_on: opened, due_on: due }));
                }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
