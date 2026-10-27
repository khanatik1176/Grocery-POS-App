import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { collectLoan, createLoan, fetchAccounting, payVendor, removePartner, savePartner, type Loan } from "@/api/pos";
import { useSession } from "@/auth/session";
import { DateField } from "@/components/DateField";
import { ListSkeleton, StatsSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, Chip, ChipRow, COLORS, EmptyState, ErrorState, Field, Icon, IconButton, Page, SectionTitle, Segmented, Sheet, ShowMore, Stat } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";
import { addDays, daysUntil, prettyDate, taka, todayIso } from "@/pos/format";

type Tab = "overview" | "vendors" | "lending" | "partners";
type Bucket = "all" | "overdue" | "week" | "month" | "later" | "settled";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "days30", label: "Last 30 days" },
];

function bucketOf(loan: Loan): Exclude<Bucket, "all"> {
  if (Number(loan.outstanding) <= 0) return "settled";
  const days = daysUntil(loan.due_on);
  if (days < 0) return "overdue";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "later";
}

function dueText(loan: Loan) {
  if (Number(loan.outstanding) <= 0) return "Settled";
  const days = daysUntil(loan.due_on);
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

export default function Accounts() {
  const { can } = useSession();
  const toast = useToast();
  const tabs = [
    can("accounting.view") || can("accounting.profit") ? { value: "overview" as Tab, label: "Overview" } : null,
    can("accounting.view") || can("accounting.pay") ? { value: "vendors" as Tab, label: "Vendors" } : null,
    can("accounting.lending") ? { value: "lending" as Tab, label: "Lending" } : null,
    can("accounting.profit") ? { value: "partners" as Tab, label: "Profit" } : null,
  ].filter((tab) => tab !== null);
  const [tab, setTab] = useState<Tab>(tabs[0]?.value ?? "overview");
  const [period, setPeriod] = useState("today");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sheet, setSheet] = useState<null | "pay" | "loan" | "partner" | { collect: Loan }>(null);

  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => fetchAccounting({ preset: period }), [period]);

  const vendorDue = useMemo(() => (data?.vendors ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.balance)), 0), [data]);
  const lent = useMemo(() => (data?.loans ?? []).reduce((sum, loan) => sum + Number(loan.outstanding), 0), [data]);
  const overdue = (data?.loans ?? []).filter((loan) => bucketOf(loan) === "overdue");
  const loans = (data?.loans ?? []).filter((loan) => (bucket === "all" ? bucketOf(loan) !== "settled" : bucketOf(loan) === bucket));
  const vendorPages = useShowMore(data?.vendors ?? []);
  const loanPages = useShowMore(loans);

  function chooseBucket(next: Bucket) {
    setBucket(next);
    loanPages.reset();
  }
  const bucketCount = (id: Bucket) => (data?.loans ?? []).filter((loan) => (id === "all" ? bucketOf(loan) !== "settled" : bucketOf(loan) === id)).length;

  function done(message: string) {
    setSheet(null);
    toast(message);
    void reload();
  }

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[COLORS.brand]} />}>
      {tabs.length > 1 ? <Segmented options={tabs} value={tab} onChange={setTab} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : <Banner text={error} />}

      {(tab === "overview" || tab === "partners") && data?.period !== null ? (
        <ChipRow>
          {PERIODS.map((item) => (
            <Chip key={item.id} label={item.label} selected={period === item.id} onPress={() => setPeriod(item.id)} />
          ))}
        </ChipRow>
      ) : null}

      {loading ? (
        <>
          <StatsSkeleton />
          <ListSkeleton rows={3} thumb={false} />
        </>
      ) : null}

      {!loading && data && tab === "overview" ? (
        <>
          {data.period ? (
            <View className="flex-row flex-wrap gap-3">
              <Stat label="Sales" value={taka(data.period.sales_total)} sub={`${data.period.count} transactions`} icon="trending-up" tone="brand" />
              <Stat label="Gross profit" value={taka(data.period.profit)} sub={prettyDate(data.period.start) + (data.period.start !== data.period.end ? ` – ${prettyDate(data.period.end)}` : "")} icon="sparkles-outline" tone="info" />
              {data.vendors ? <Stat label="Owed to vendors" value={taka(vendorDue)} sub={`${data.vendors.filter((row) => Number(row.balance) > 0).length} vendors`} icon="people-outline" tone="warn" /> : null}
              {data.loans ? <Stat label="Lending to collect" value={taka(lent)} sub={`${overdue.length} overdue`} icon="hand-left-outline" tone={overdue.length ? "danger" : "neutral"} /> : null}
            </View>
          ) : null}
          {overdue.length > 0 ? (
            <>
              <SectionTitle title="Overdue lending" action={{ label: "View all", onPress: () => { setTab("lending"); chooseBucket("overdue"); } }} />
              <Card className="overflow-hidden">
                {overdue.slice(0, 4).map((loan, index) => (
                  <LoanRow key={loan.id} loan={loan} last={index === Math.min(overdue.length, 4) - 1} onPress={() => setSheet({ collect: loan })} />
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {!loading && data && tab === "vendors" ? (
        <>
          {can("accounting.pay") ? <Button label="Record vendor payment" icon="add" onPress={() => setSheet("pay")} /> : null}
          {(data.vendors ?? []).length === 0 ? (
            <EmptyState icon="people-outline" title="No vendors yet" body="Vendors appear when stock is received from them." />
          ) : (
            <Card className="overflow-hidden">
              {vendorPages.visible.map((row, index, all) => (
                <Pressable
                  key={row.name}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/vendor/[name]", params: { name: row.name } })}
                  className={`flex-row items-center gap-3 px-4 py-3 active:bg-canvas ${index < all.length - 1 ? "border-b border-line" : ""}`}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
                    <Text className="text-base font-bold text-body">{row.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-ink">{row.name}</Text>
                    <Text className="text-xs text-muted">
                      Bought {taka(row.purchased)} · Paid {taka(row.paid)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-base font-bold ${Number(row.balance) > 0 ? "text-warn" : "text-brand-dark"}`}>{taka(row.balance)}</Text>
                    <Text className="text-[11px] text-muted">{Number(row.balance) > 0 ? "due" : "settled"}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
          <ShowMore remaining={vendorPages.remaining} onPress={vendorPages.showMore} noun="vendors" />
        </>
      ) : null}

      {!loading && data && tab === "lending" ? (
        <>
          <Button label="New lending" icon="add" onPress={() => setSheet("loan")} />
          <ChipRow>
            {(
              [
                ["all", "Open"],
                ["overdue", "Overdue"],
                ["week", "Due ≤ 7 days"],
                ["month", "Due ≤ 30 days"],
                ["later", "Later"],
                ["settled", "Settled"],
              ] as [Bucket, string][]
            ).map(([id, label]) => (
              <Chip key={id} label={label} count={bucketCount(id)} selected={bucket === id} onPress={() => chooseBucket(id)} />
            ))}
          </ChipRow>
          {loans.length === 0 ? (
            <EmptyState
              icon="hand-left-outline"
              title={bucket === "all" ? "No open lending" : "Nothing in this group"}
              body={bucket === "all" ? "Money lent to customers or staff will show up here until it is collected." : "Lending in this group will show up here."}
              action={bucket === "all" ? { label: "New lending", icon: "add", onPress: () => setSheet("loan") } : undefined}
            />
          ) : (
            <Card className="overflow-hidden">
              {loanPages.visible.map((loan, index, all) => (
                <LoanRow key={loan.id} loan={loan} last={index === all.length - 1} onPress={Number(loan.outstanding) > 0 ? () => setSheet({ collect: loan }) : undefined} />
              ))}
            </Card>
          )}
          <ShowMore remaining={loanPages.remaining} onPress={loanPages.showMore} noun="records" />
        </>
      ) : null}

      {!loading && data?.partners && tab === "partners" ? (
        <>
          <Card className="p-4">
            <Text className="text-xs text-muted">Profit to share · {PERIODS.find((item) => item.id === period)?.label}</Text>
            <Text className="text-2xl font-bold text-ink">{taka(data.period?.profit)}</Text>
          </Card>
          {data.partners.shares.length === 0 ? (
            <EmptyState icon="pie-chart-outline" title="No profit partners" body="Add a partner and their share; the shop keeps whatever is left." />
          ) : null}
          <Card className="overflow-hidden">
            {data.partners.shares.map((row) => (
              <View key={row.name} className="flex-row items-center gap-3 border-b border-line px-4 py-3">
                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{row.name}</Text>
                  <Text className="text-xs text-muted">{Number(row.share)}% share</Text>
                </View>
                <Text className="text-base font-bold text-ink">{taka(row.amount)}</Text>
                <IconButton
                  icon="trash-outline"
                  label={`Remove ${row.name}`}
                  tone="danger"
                  size={32}
                  onPress={() =>
                    void removePartner(row.name)
                      .then(() => done(`${row.name} removed`))
                      .catch((err) => toast(apiError(err), "error"))
                  }
                />
              </View>
            ))}
            <View className="flex-row items-center gap-3 bg-canvas px-4 py-3">
              <Icon name="storefront-outline" size={18} color={COLORS.muted} />
              <View className="flex-1">
                <Text className="text-base font-medium text-ink">Shop keeps</Text>
                <Text className="text-xs text-muted">{Number(data.partners.shop_share)}% share</Text>
              </View>
              <Text className="text-base font-bold text-ink">{taka(data.partners.shop_amount)}</Text>
            </View>
          </Card>
          <Button label="Add or update partner" icon="person-add-outline" variant="secondary" onPress={() => setSheet("partner")} />
        </>
      ) : null}

      <PaySheet
        visible={sheet === "pay"}
        vendors={(data?.vendors ?? []).map((row) => row.name)}
        onClose={() => setSheet(null)}
        onDone={(name) => done(`Payment to ${name} recorded`)}
      />
      <LoanSheet visible={sheet === "loan"} onClose={() => setSheet(null)} onDone={() => done("Lending recorded")} />
      <PartnerSheet visible={sheet === "partner"} onClose={() => setSheet(null)} onDone={() => done("Profit share saved")} />
      <CollectSheet loan={sheet && typeof sheet === "object" ? sheet.collect : null} onClose={() => setSheet(null)} onDone={() => done("Collection recorded")} />
    </Page>
  );
}

function LoanRow({ loan, last, onPress }: { loan: Loan; last: boolean; onPress?: () => void }) {
  const bucket = bucketOf(loan);
  const progress = Number(loan.amount) > 0 ? Number(loan.collected) / Number(loan.amount) : 0;
  const tone = bucket === "overdue" ? "danger" : bucket === "week" ? "warn" : bucket === "settled" ? "brand" : "neutral";
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} className={`gap-2 px-4 py-3 active:bg-canvas ${last ? "" : "border-b border-line"}`}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-base font-medium text-ink">{loan.borrower}</Text>
          <Text className="text-xs text-muted">
            Lent {prettyDate(loan.opened_on)} · due {prettyDate(loan.due_on)}
            {loan.note ? ` · ${loan.note}` : ""}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-ink">{taka(loan.outstanding)}</Text>
          <Badge label={dueText(loan)} tone={tone} />
        </View>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-line">
        <View style={{ width: `${Math.min(100, progress * 100)}%` }} className="h-full rounded-full bg-brand" />
      </View>
      <Text className="text-[11px] text-muted">
        Collected {taka(loan.collected)} of {taka(loan.amount)}
      </Text>
    </Pressable>
  );
}

function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function PaySheet({ visible, vendors, onClose, onDone }: { visible: boolean; vendors: string[]; onClose: () => void; onDone: (name: string) => void }) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const { busy, error, run } = useSubmit(() => {
    onDone(vendor);
    setAmount("");
    setNote("");
  });
  return (
    <Sheet visible={visible} title="Record vendor payment" onClose={onClose}>
      <Banner text={error} />
      <Field label="Vendor" icon="person-outline" value={vendor} onChangeText={setVendor} />
      {vendors.length > 0 ? (
        <ChipRow>
          {vendors.map((name) => (
            <Chip key={name} label={name} selected={vendor === name} onPress={() => setVendor(name)} />
          ))}
        </ChipRow>
      ) : null}
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="৳" />
      <DateField label="Paid on" value={paidOn} onChange={setPaidOn} maximumDate={new Date()} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Cheque no., bKash txn…" />
      <Button label="Save payment" busy={busy} disabled={!vendor.trim() || !(Number(amount) > 0)} onPress={() => void run(() => payVendor({ vendor: vendor.trim(), amount, paid_on: paidOn, note }))} />
    </Sheet>
  );
}

function LoanSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [borrower, setBorrower] = useState("");
  const [amount, setAmount] = useState("");
  const [opened, setOpened] = useState(todayIso());
  const [due, setDue] = useState(addDays(todayIso(), 30));
  const [note, setNote] = useState("");
  const { busy, error, run } = useSubmit(() => {
    onDone();
    setBorrower("");
    setAmount("");
    setNote("");
  });
  return (
    <Sheet visible={visible} title="New lending" onClose={onClose}>
      <Banner text={error} />
      <Field label="Borrower" icon="person-outline" value={borrower} onChangeText={setBorrower} />
      <Field label="Amount lent" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="৳" />
      <View className="flex-row gap-3">
        <DateField label="Lent on" value={opened} onChange={setOpened} />
        <DateField label="Due on" value={due} onChange={setDue} />
      </View>
      <ChipRow>
        {[7, 15, 30, 60, 90].map((days) => (
          <Chip key={days} label={`${days} days`} selected={due === addDays(opened, days)} onPress={() => setDue(addDays(opened, days))} />
        ))}
      </ChipRow>
      <Field label="Note (optional)" value={note} onChangeText={setNote} />
      <Button
        label="Save lending"
        busy={busy}
        disabled={!borrower.trim() || !(Number(amount) > 0)}
        onPress={() => void run(() => createLoan({ borrower: borrower.trim(), amount, opened_on: opened, due_on: due, note }))}
      />
    </Sheet>
  );
}

function CollectSheet({ loan, onClose, onDone }: { loan: Loan | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const { busy, error, run } = useSubmit(() => {
    onDone();
    setAmount("");
  });
  return (
    <Sheet visible={loan !== null} title={loan ? `Collect from ${loan.borrower}` : "Collect"} onClose={onClose}>
      <Banner text={error} />
      {loan ? (
        <>
          <Card className="flex-row p-0">
            <View className="flex-1 p-3">
              <Text className="text-xs text-muted">Outstanding</Text>
              <Text className="text-lg font-bold text-ink">{taka(loan.outstanding)}</Text>
            </View>
            <View className="flex-1 border-l border-line p-3">
              <Text className="text-xs text-muted">{dueText(loan)}</Text>
              <Text className="text-lg font-bold text-ink">{prettyDate(loan.due_on)}</Text>
            </View>
          </Card>
          <Field label="Amount collected" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="৳" />
          <Button label="Collect full amount" variant="secondary" size="sm" onPress={() => setAmount(loan.outstanding)} />
          <Button label="Save collection" busy={busy} disabled={!(Number(amount) > 0)} onPress={() => void run(() => collectLoan(loan.id, amount))} />
        </>
      ) : null}
    </Sheet>
  );
}

function PartnerSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const { busy, error, run } = useSubmit(() => {
    onDone();
    setName("");
    setShare("");
  });
  return (
    <Sheet visible={visible} title="Profit partner" onClose={onClose}>
      <Banner text={error} />
      <Field label="Partner name" hint="Using an existing name updates that partner's share." value={name} onChangeText={setName} />
      <Field label="Share of profit" value={share} onChangeText={setShare} keyboardType="decimal-pad" suffix="%" />
      <Button label="Save share" busy={busy} disabled={!name.trim() || !(Number(share) >= 0) || share === ""} onPress={() => void run(() => savePartner(name.trim(), share))} />
    </Sheet>
  );
}
