import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { checkoutSale, fetchPaymentConfig, parseSms, type PaymentConfig, type SaleResult } from "@/api/pos";
import { QrMark } from "@/components/QrMark";
import { useToast } from "@/components/toast";
import { Badge, Banner, Button, Card, COLORS, EmptyState, Field, Icon, KeyValue, Page, SectionTitle, type IconName } from "@/components/ui";
import { useCart } from "@/pos/cart";
import { isEmail, normalizeMobile, PAYMENT_LABELS, prettyTime, taka } from "@/pos/format";
import { printHtml } from "@/pos/print";

type Wallet = "bkash" | "nagad" | "rocket";
type Stage = "method" | "cash" | "card" | Wallet | "done";

const METHODS: { id: Exclude<Stage, "method" | "done">; label: string; icon: IconName; color: string }[] = [
  { id: "cash", label: "Cash", icon: "cash-outline", color: COLORS.brand },
  { id: "card", label: "Card", icon: "card-outline", color: COLORS.info },
  { id: "bkash", label: "bKash", icon: "phone-portrait-outline", color: "#E2136E" },
  { id: "nagad", label: "Nagad", icon: "phone-portrait-outline", color: "#F6921E" },
  { id: "rocket", label: "Rocket", icon: "phone-portrait-outline", color: "#8C3494" },
];

function isWallet(stage: Stage): stage is Wallet {
  return stage === "bkash" || stage === "nagad" || stage === "rocket";
}

/** Suggested cash amounts: exact, then the next round notes above the total. */
function tenderOptions(total: number) {
  const options = new Set<number>([total]);
  for (const step of [10, 50, 100, 500, 1000]) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total) {
      options.add(rounded);
    }
  }
  return [...options].sort((a, b) => a - b).slice(0, 5);
}

export default function Checkout() {
  const cart = useCart();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("method");
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sale, setSale] = useState<SaleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentConfig()
      .then((response) => setConfig(response.data))
      .catch(() => undefined);
  }, []);

  const total = cart.quote?.total ?? "0.00";
  // Receipt contacts are optional, but anything typed must be valid before payment starts.
  const mobile = phone.trim() ? normalizeMobile(phone) : "";
  const phoneError = mobile === null ? "Enter a valid mobile number, like 01712345678, or leave it empty." : null;
  const emailError = email.trim() && !isEmail(email) ? "Enter a full email address, like name@example.com, or leave it empty." : null;
  const contactInvalid = phoneError !== null || emailError !== null;

  async function complete(method: string, amount: string, txn = "") {
    setBusy(true);
    setError(null);
    try {
      const response = await checkoutSale({
        location: cart.location,
        lines: cart.payload,
        payment: { method, amount_taken: amount, txn_number: txn },
        customer_phone: mobile ?? "",
        customer_email: email.trim(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setSale(response.data);
      setStage("done");
      cart.clear();
    } catch (err) {
      const message = apiError(err);
      setError(message);
      toast(message, "error");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (stage === "done" && sale) {
    return (
      <Done
        sale={sale}
        onNew={() => router.back()}
        onPrinted={() => {
          toast(`Receipt #${sale.number} printed`);
          router.back();
        }}
        onPrintFailed={() => toast("Printing was cancelled or failed. Try again or start a new sale.", "error")}
      />
    );
  }

  if (!cart.quote || cart.lines.length === 0) {
    return (
      <Page>
        <EmptyState icon="cart-outline" title="The cart is empty" body="Add items before taking payment." action={{ label: "Back to register", onPress: () => router.back() }} />
      </Page>
    );
  }

  return (
    <Page bottomInset={40}>
      <Card className="items-center px-4 py-5">
        <Text className="text-sm font-medium text-muted">Amount due · {cart.location}</Text>
        <Text className="mt-1 text-4xl font-bold text-ink">{taka(total)}</Text>
        <Text className="mt-1 text-sm text-muted">
          {cart.count} item{cart.count === 1 ? "" : "s"}
        </Text>
      </Card>

      {stage === "method" ? (
        <>
          <SectionTitle title="Digital receipt (optional)" />
          <Card className="gap-3 p-4">
            <Field
              label="Customer mobile"
              icon="call-outline"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={phoneError}
            />
            <Field
              label="Customer email"
              icon="mail-outline"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              error={emailError}
            />
            <Text className="text-xs leading-4 text-muted">
              Leave both empty to skip. SMS carries a link to the receipt; email carries the receipt itself.
              {config && !config.sms_enabled ? " SMS is off in settings." : ""}
              {config && !config.email_enabled ? " Email is off in settings." : ""}
            </Text>
          </Card>
          <SectionTitle title="Payment method" />
          {contactInvalid ? <Banner tone="warn" text="Fix or clear the receipt details above to continue." /> : null}
          <View className="flex-row flex-wrap gap-3">
            {METHODS.map((method) => (
              <Pressable
                key={method.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: contactInvalid }}
                disabled={contactInvalid}
                onPress={() => {
                  setError(null);
                  setStage(method.id);
                }}
                className={`min-w-[30%] flex-1 items-center gap-2 rounded-xl border border-line bg-surface py-4 active:bg-canvas ${contactInvalid ? "opacity-40" : ""}`}
              >
                <View style={{ backgroundColor: `${method.color}1A` }} className="h-11 w-11 items-center justify-center rounded-full">
                  <Icon name={method.icon} size={22} color={method.color} />
                </View>
                <Text className="text-sm font-semibold text-ink">{method.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <ReceiptTo phone={mobile ?? ""} email={email.trim()} onEdit={() => setStage("method")} />
      )}

      {stage === "cash" ? <CashStep total={total} busy={busy} onComplete={(amount) => void complete("cash", amount)} onBack={() => setStage("method")} /> : null}

      {stage === "card" ? <CardStep total={total} busy={busy} onComplete={(reference) => void complete("card", total, reference)} onBack={() => setStage("method")} /> : null}

      {isWallet(stage) ? (
        <WalletStep
          key={stage}
          wallet={stage}
          total={total}
          merchant={config?.wallets[stage] ?? ""}
          timeout={config?.timeout_seconds ?? 45}
          busy={busy}
          onComplete={(amount, txn) => void complete(stage, amount, txn)}
          onBack={() => setStage("method")}
        />
      ) : null}

      <Banner text={error} onDismiss={() => setError(null)} />
    </Page>
  );
}

function ReceiptTo({ phone, email, onEdit }: { phone: string; email: string; onEdit: () => void }) {
  const to = [phone, email].filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onEdit} className="flex-row items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 active:bg-canvas">
      <Icon name="receipt-outline" size={16} color={COLORS.muted} />
      <Text className="flex-1 text-sm text-body" numberOfLines={1}>
        {to ? `Receipt to ${to}` : "No digital receipt"}
      </Text>
      <Text className="text-sm font-semibold text-brand">Edit</Text>
    </Pressable>
  );
}

function CashStep({ total, busy, onComplete, onBack }: { total: string; busy: boolean; onComplete: (amount: string) => void; onBack: () => void }) {
  const [taken, setTaken] = useState("");
  const due = Number(total);
  const amount = Number(taken);
  const valid = taken !== "" && Number.isFinite(amount);
  const change = valid ? amount - due : null;

  return (
    <>
      <SectionTitle title="Cash received" action={{ label: "Change method", onPress: onBack }} />
      <Card className="gap-4 p-4">
        <View className="flex-row flex-wrap gap-2">
          {tenderOptions(due).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setTaken(option.toFixed(2))}
              className={`h-10 items-center justify-center rounded-lg border px-3 ${Number(taken) === option ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
            >
              <Text className="text-sm font-semibold text-ink">{option === due ? "Exact" : taka(option).replace(".00", "")}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Amount received" icon="cash-outline" value={taken} onChangeText={setTaken} keyboardType="decimal-pad" placeholder={total} />
        <View className={`flex-row items-center justify-between rounded-lg px-4 py-3 ${change !== null && change < 0 ? "bg-danger-soft" : "bg-brand-soft"}`}>
          <Text className={`text-base font-semibold ${change !== null && change < 0 ? "text-danger" : "text-brand-dark"}`}>
            {change !== null && change < 0 ? "Still due" : "Change to return"}
          </Text>
          <Text className={`text-2xl font-bold ${change !== null && change < 0 ? "text-danger" : "text-brand-dark"}`}>
            {change === null ? "—" : taka(Math.abs(change))}
          </Text>
        </View>
        <Button label="Complete cash sale" icon="checkmark" size="lg" busy={busy} disabled={change === null || change < 0} onPress={() => onComplete(amount.toFixed(2))} />
      </Card>
    </>
  );
}

function CardStep({ total, busy, onComplete, onBack }: { total: string; busy: boolean; onComplete: (reference: string) => void; onBack: () => void }) {
  const [reference, setReference] = useState("");
  return (
    <>
      <SectionTitle title="Card payment" action={{ label: "Change method", onPress: onBack }} />
      <Card className="gap-4 p-4">
        <Text className="text-sm leading-5 text-body">Charge {taka(total)} on the card terminal, then record the approval code.</Text>
        <Field label="Approval / reference (optional)" icon="receipt-outline" autoCapitalize="characters" value={reference} onChangeText={setReference} />
        <Button label="Complete card sale" icon="checkmark" size="lg" busy={busy} onPress={() => onComplete(reference.trim())} />
      </Card>
    </>
  );
}

function WalletStep({
  wallet,
  total,
  merchant,
  timeout,
  busy,
  onComplete,
  onBack,
}: {
  wallet: Wallet;
  total: string;
  merchant: string;
  timeout: number;
  busy: boolean;
  onComplete: (amount: string, txn: string) => void;
  onBack: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(timeout);
  const [manual, setManual] = useState(false);
  const [txn, setTxn] = useState("");
  const [amount, setAmount] = useState(total);
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ignored = useRef("");
  const seen = useRef("");
  const label = PAYMENT_LABELS[wallet];

  function apply(parsed: { amount: string; txn_number: string }) {
    setTxn(parsed.txn_number);
    setAmount(parsed.amount);
    setDetected(true);
    setError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }

  // Countdown before switching to manual entry.
  useEffect(() => {
    if (manual || detected) {
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setManual(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [manual, detected]);

  // Watch the clipboard for a copied payment SMS and read it automatically.
  useEffect(() => {
    if (detected) {
      return;
    }
    let active = true;
    const timer = setInterval(() => {
      Clipboard.getStringAsync()
        .then(async (text) => {
          if (!active || !text.trim() || text === ignored.current || text === seen.current) {
            return;
          }
          seen.current = text;
          try {
            const parsed = await parseSms(text);
            if (active) {
              apply(parsed.data);
            }
          } catch {
            // The clipboard does not hold a wallet SMS.
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [detected]);

  async function pasteSms() {
    setError(null);
    try {
      const text = await Clipboard.getStringAsync();
      seen.current = text;
      apply((await parseSms(text)).data);
    } catch (err) {
      setError(apiError(err));
    }
  }

  const mismatch = detected && Number(amount) !== Number(total);
  const progress = timeout > 0 ? secondsLeft / timeout : 0;

  return (
    <>
      <SectionTitle title={`${label} payment`} action={{ label: "Change method", onPress: onBack }} />
      <Card className="items-center gap-3 p-4">
        <QrMark value={`${wallet}|${merchant}|${total}`} />
        <View className="items-center">
          <Text className="text-base font-semibold text-ink">
            {label} merchant {merchant || "— not set"}
          </Text>
          <Text className="text-sm text-muted">Customer scans and pays {taka(total)}</Text>
        </View>
        {!merchant ? <Banner tone="warn" text={`Add the ${label} number in Store settings so customers know where to pay.`} /> : null}

        {detected ? (
          <View className="w-full gap-2 rounded-lg bg-brand-soft p-3">
            <View className="flex-row items-center gap-2">
              <Icon name="checkmark-circle" size={20} color={COLORS.brandDark} />
              <Text className="flex-1 text-sm font-semibold text-brand-dark">Payment SMS detected</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  ignored.current = seen.current;
                  setDetected(false);
                  setTxn("");
                  setAmount(total);
                }}
              >
                <Text className="text-sm font-semibold text-danger">Not this SMS</Text>
              </Pressable>
            </View>
            <KeyValue label="Transaction ID" value={txn} />
            <KeyValue label="Amount" value={taka(amount)} />
          </View>
        ) : !manual ? (
          <View className="w-full gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-body">Waiting for the payment SMS…</Text>
              <Text className="text-sm font-semibold text-ink">{secondsLeft}s</Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-line">
              <View style={{ width: `${progress * 100}%` }} className="h-full rounded-full bg-brand" />
            </View>
            <Text className="text-xs leading-4 text-muted">
              Copy the {label} SMS on this phone and it is read automatically, or paste it below.
            </Text>
          </View>
        ) : null}

        <Banner text={error} onDismiss={() => setError(null)} />

        {!detected ? (
          <View className="w-full flex-row gap-2">
            <View className="flex-1">
              <Button label="Paste SMS" icon="clipboard-outline" variant="secondary" onPress={() => void pasteSms()} />
            </View>
            {!manual ? (
              <View className="flex-1">
                <Button label="Enter manually" icon="create-outline" variant="secondary" onPress={() => setManual(true)} />
              </View>
            ) : null}
          </View>
        ) : null}

        {manual && !detected ? (
          <View className="w-full gap-3">
            <Banner tone="info" text="Enter the transaction ID and amount from the customer's confirmation." />
            <Field label="Transaction ID" icon="key-outline" value={txn} onChangeText={setTxn} autoCapitalize="characters" />
            <Field label="Amount" icon="cash-outline" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          </View>
        ) : null}

        {mismatch ? <Banner tone="warn" text={`The SMS amount ${taka(amount)} does not match the total ${taka(total)}.`} /> : null}

        <View className="w-full">
          <Button
            label={`Complete ${label} sale`}
            icon="checkmark"
            size="lg"
            busy={busy}
            disabled={!txn.trim() || !amount || Number(amount) !== Number(total)}
            onPress={() => onComplete(Number(amount).toFixed(2), txn.trim())}
          />
        </View>
      </Card>
    </>
  );
}

function Done({ sale, onNew, onPrinted, onPrintFailed }: { sale: SaleResult; onNew: () => void; onPrinted: () => void; onPrintFailed: () => void }) {
  const [printing, setPrinting] = useState(false);
  const sms = sale.delivery.sms;
  const email = sale.delivery.email;

  return (
    <Page bottomInset={40}>
      <Stack.Screen options={{ title: "Sale complete", headerLeft: () => null, headerBackVisible: false }} />
      <Card className="items-center px-4 py-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
          <Icon name="checkmark" size={36} color={COLORS.brandDark} />
        </View>
        <Text className="mt-3 text-sm font-medium text-muted">Paid by {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</Text>
        <Text className="text-4xl font-bold text-ink">{taka(sale.total)}</Text>
        {sale.payment_method === "cash" ? (
          <View className="mt-3 items-center rounded-lg bg-brand-soft px-5 py-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Change due</Text>
            <Text className="text-2xl font-bold text-brand-dark">{taka(sale.change)}</Text>
          </View>
        ) : sale.txn_number ? (
          <Text className="mt-2 text-sm text-body">Txn {sale.txn_number}</Text>
        ) : null}
      </Card>

      <SectionTitle title="Receipt" />
      <Card className="p-4">
        <View className="flex-row items-center justify-between border-b border-dashed border-line pb-2">
          <Text className="text-sm font-semibold text-ink">#{sale.number}</Text>
          <Text className="text-xs text-muted">{prettyTime(sale.created_at)}</Text>
        </View>
        {sale.lines.map((line, index) => (
          <View key={`${line.name}-${index}`} className="flex-row justify-between py-1.5">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-ink">
                {line.name} × {line.quantity}
              </Text>
              {line.detail ? <Text className="text-xs text-muted">{line.detail}</Text> : null}
            </View>
            <Text className="text-sm font-medium text-ink">{taka(line.line_total)}</Text>
          </View>
        ))}
        <View className="mt-1 border-t border-dashed border-line pt-2">
          <KeyValue label="Total" value={taka(sale.total)} strong />
          {sale.payment_method === "cash" ? (
            <>
              <KeyValue label="Cash received" value={taka(sale.amount_taken)} />
              <KeyValue label="Change" value={taka(sale.change)} />
            </>
          ) : null}
        </View>
      </Card>

      <SectionTitle title="Delivery" />
      <Card className="gap-2 p-4">
        <DeliveryRow icon="chatbubble-outline" label="SMS" ok={sms.sent} text={sms.sent ? `Link sent to ${sms.to}` : sms.detail ?? ""} />
        <DeliveryRow icon="mail-outline" label="Email" ok={email.sent} text={email.sent ? `Receipt sent to ${email.to}` : email.detail ?? ""} />
      </Card>

      <View className="gap-2">
        <Button
          label="Print receipt"
          icon="print-outline"
          size="lg"
          busy={printing}
          onPress={() => {
            setPrinting(true);
            // A finished print returns to the register; a cancelled one stays here to retry.
            printHtml(sale.receipt_html)
              .then((ok) => {
                setPrinting(false);
                if (ok) {
                  onPrinted();
                } else {
                  onPrintFailed();
                }
              })
              .catch(() => {
                setPrinting(false);
                onPrintFailed();
              });
          }}
        />
        <Button label="No receipt — new sale" variant="secondary" size="lg" onPress={onNew} />
      </View>
    </Page>
  );
}

function DeliveryRow({ icon, label, ok, text }: { icon: IconName; label: string; ok: boolean; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Icon name={icon} size={18} color={COLORS.muted} />
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">{label}</Text>
        <Text className="text-xs text-muted">{text}</Text>
      </View>
      <Badge label={ok ? "Sent" : "Skipped"} tone={ok ? "brand" : "neutral"} />
    </View>
  );
}
