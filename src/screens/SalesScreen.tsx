import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiError } from "../api/client";
import {
  checkoutSale,
  fetchCatalog,
  fetchPaymentConfig,
  fetchPlaces,
  parseSms,
  quoteSale,
  type Catalog,
  type PaymentConfig,
  type Place,
  type Quote,
  type SaleResult,
} from "../api/pos";
import { QrMark } from "../components/QrMark";
import { ScannerPane } from "../components/ScannerPane";
import { Button, Field, Notice, TopBar } from "../components/ui";
import { taka } from "../pos/format";
import { printHtml } from "../pos/print";

type CartLine = { key: string; kind: "product" | "bundle"; name: string; quantity: number };
type Stage = "sell" | "pay" | "cash" | "wallet" | "done";
type Wallet = "bkash" | "nagad" | "rocket";

export function SalesScreen({ onBack }: { onBack: () => void }) {
  const [paused, setPaused] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [location, setLocation] = useState("Shop");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [stage, setStage] = useState<Stage>("sell");
  const [wallet, setWallet] = useState<Wallet>("bkash");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taken, setTaken] = useState("");
  const [txn, setTxn] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [manual, setManual] = useState(false);
  const [detected, setDetected] = useState(false);
  const [sale, setSale] = useState<SaleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ignoredSms = useRef("");
  const seenSms = useRef("");

  useEffect(() => {
    fetchPlaces()
      .then((response) => {
        setPlaces(response.data);
        const shop = response.data.find((place) => place.kind === "shop") ?? response.data[0];
        if (shop) {
          setLocation(shop.name);
        }
      })
      .catch((err) => setError(apiError(err)));
    fetchPaymentConfig()
      .then((response) => setConfig(response.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setCatalog(null);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      fetchCatalog(query.trim(), location)
        .then((response) => {
          if (active) {
            setCatalog(response.data);
          }
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, location]);

  const lines = useMemo(
    () =>
      cart.map((line) =>
        line.kind === "product"
          ? { barcode: line.key, quantity: line.quantity }
          : { bundle: line.key, quantity: line.quantity },
      ),
    [cart],
  );

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    let active = true;
    quoteSale(location, lines)
      .then((response) => {
        if (active) {
          setQuote(response.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setQuote(null);
          setError(apiError(err));
        }
      });
    return () => {
      active = false;
    };
  }, [location, lines]);

  function addLine(kind: CartLine["kind"], key: string, name: string) {
    setCart((current) => {
      const existing = current.find((line) => line.kind === kind && line.key === key);
      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { kind, key, name, quantity: 1 }];
    });
    setQuery("");
  }

  function changeQty(key: string, kind: CartLine["kind"], delta: number) {
    setCart((current) =>
      current
        .map((line) => (line.key === key && line.kind === kind ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  async function finish(method: string, amount: string, txnNumber = "") {
    setBusy(true);
    setError(null);
    try {
      const response = await checkoutSale({
        location,
        lines,
        payment: { method, amount_taken: amount, txn_number: txnNumber },
        customer_phone: phone.trim(),
        customer_email: email.trim(),
      });
      setSale(response.data);
      setStage("done");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openWallet(next: Wallet) {
    setWallet(next);
    setTxn("");
    setWalletAmount(quote?.total ?? "");
    setDetected(false);
    setManual(false);
    setSecondsLeft(config?.timeout_seconds ?? 45);
    setStage("wallet");
  }

  useEffect(() => {
    if (stage !== "wallet" || manual) {
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
  }, [stage, manual]);

  useEffect(() => {
    if (stage !== "wallet" || detected) {
      return;
    }
    let active = true;
    const timer = setInterval(() => {
      Clipboard.getStringAsync()
        .then(async (text) => {
          if (!active || !text.trim() || text === ignoredSms.current) {
            return;
          }
          try {
            const parsed = await parseSms(text);
            if (!active) {
              return;
            }
            seenSms.current = text;
            setTxn(parsed.data.txn_number);
            setWalletAmount(parsed.data.amount);
            setDetected(true);
          } catch {
            // The clipboard is not a wallet SMS yet.
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [stage, detected]);

  async function readSms() {
    setError(null);
    try {
      const text = await Clipboard.getStringAsync();
      const parsed = await parseSms(text);
      seenSms.current = text;
      ignoredSms.current = "";
      setTxn(parsed.data.txn_number);
      setWalletAmount(parsed.data.amount);
      setDetected(true);
    } catch (err) {
      setError(apiError(err));
    }
  }

  const total = quote?.total ?? "0.00";
  const cashNumber = Number(taken);
  const change = Number.isFinite(cashNumber) ? (cashNumber - Number(total)).toFixed(2) : "";
  const merchant = config?.wallets[wallet] ?? "";

  if (stage === "done" && sale) {
    return (
      <SafeAreaView className="flex-1 bg-ink">
        <TopBar title="Sale complete" onBack={onBack} />
        <ScrollView contentContainerClassName="px-4 pb-12">
          <View className="rounded-3xl bg-paper p-5">
            <Text className="text-lg font-bold text-ink">Receipt {sale.number}</Text>
            <Text className="mt-2 text-3xl font-bold text-leaf">{taka(sale.total)}</Text>
            {sale.payment_method === "cash" ? (
              <Text className="mt-3 text-base text-ink">
                Taken {taka(sale.amount_taken)} · Change {taka(sale.change)}
              </Text>
            ) : (
              <Text className="mt-3 text-base text-ink">
                {sale.payment_method} · {sale.txn_number}
              </Text>
            )}
            <Text className="mt-3 text-sm text-mist">{sale.delivery.sms.sent ? sale.delivery.sms.body : sale.delivery.sms.detail}</Text>
            <Text className="mt-1 text-sm text-mist">{sale.delivery.email.sent ? `Email sent to ${sale.delivery.email.to}` : sale.delivery.email.detail}</Text>
            <View className="mt-4 gap-2">
              <Button label="Print receipt" onPress={() => void printHtml(sale.receipt_html)} />
              <Button
                label="New sale"
                variant="secondary"
                onPress={() => {
                  setCart([]);
                  setSale(null);
                  setStage("sell");
                  setPaused(false);
                }}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === "cash" || stage === "wallet" || stage === "pay") {
    return (
      <SafeAreaView className="flex-1 bg-ink">
        <TopBar title="Payment" onBack={() => setStage("sell")} />
        <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
          <View className="rounded-3xl bg-paper p-4">
            <Text className="text-sm text-mist">Total</Text>
            <Text className="text-3xl font-bold text-ink">{taka(total)}</Text>
            <Notice text={error} />
            <View className="mt-4">
              <Field label="Customer mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="Customer email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
            {stage === "pay" ? (
              <View className="gap-3">
                <Button label="Cash" onPress={() => setStage("cash")} />
                <Button label="bKash" variant="secondary" onPress={() => openWallet("bkash")} />
                <Button label="Nagad" variant="secondary" onPress={() => openWallet("nagad")} />
                <Button label="Rocket" variant="secondary" onPress={() => openWallet("rocket")} />
              </View>
            ) : null}
            {stage === "cash" ? (
              <View className="mt-4">
                <Field label="Cash taken" value={taken} onChangeText={setTaken} keyboardType="decimal-pad" />
                <Text className="mb-3 text-base text-ink">Change {change === "" ? "—" : taka(change)}</Text>
                <Button
                  label="Complete cash sale"
                  busy={busy}
                  disabled={change === "" || Number(change) < 0}
                  onPress={() => void finish("cash", Number(taken).toFixed(2))}
                />
              </View>
            ) : null}
            {stage === "wallet" ? (
              <View className="mt-4 items-center">
                <QrMark value={`${wallet}|${merchant}|${total}`} />
                <Text className="mt-3 text-center text-base font-semibold text-ink">
                  {wallet === "bkash" ? "bKash" : wallet === "nagad" ? "Nagad" : "Rocket"} {merchant || "number not set"}
                </Text>
                <Text className="mt-1 text-center text-sm text-mist">
                  {manual ? "Enter the transaction number and amount." : `Waiting for the payment SMS · ${secondsLeft}s`}
                </Text>
                {detected ? (
                  <View className="mt-2 w-full">
                    <Text className="text-center text-sm font-semibold text-leaf">
                      SMS detected · {txn} · {taka(walletAmount)}
                    </Text>
                    <View className="mt-2">
                      <Button
                        label="Not this SMS"
                        variant="secondary"
                        onPress={() => {
                          ignoredSms.current = seenSms.current;
                          setDetected(false);
                          setTxn("");
                          setWalletAmount(quote?.total ?? "");
                        }}
                      />
                    </View>
                  </View>
                ) : null}
                {!manual ? (
                  <View className="mt-3 w-full">
                    <Button label="Paste payment SMS" variant="secondary" onPress={() => void readSms()} />
                  </View>
                ) : (
                  <View className="mt-3 w-full">
                    <Field label="Transaction number" value={txn} onChangeText={setTxn} autoCapitalize="characters" />
                    <Field label="Amount" value={walletAmount} onChangeText={setWalletAmount} keyboardType="decimal-pad" />
                  </View>
                )}
                <View className="mt-3 w-full">
                  <Button
                    label="Complete wallet sale"
                    busy={busy}
                    disabled={!txn || !walletAmount}
                    onPress={() => void finish(wallet, walletAmount, txn)}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <TopBar title="Sales" onBack={onBack} />
      <ScrollView contentContainerClassName="px-4 pb-28" keyboardShouldPersistTaps="handled">
        <View className="mb-3 flex-row flex-wrap gap-2">
          {places.map((place) => (
            <Pressable
              key={place.name}
              accessibilityRole="button"
              onPress={() => setLocation(place.name)}
              className={`rounded-full px-3 py-2 ${location === place.name ? "bg-paper" : "bg-bark"}`}
            >
              <Text className={location === place.name ? "font-semibold text-ink" : "text-cream"}>{place.name}</Text>
            </Pressable>
          ))}
        </View>
        <ScannerPane paused={paused} onPause={() => setPaused(true)} onResume={() => setPaused(false)} onCode={(code) => addLine("product", code, code)} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search product or combo"
          placeholderTextColor="#8C8376"
          className="mb-3 mt-3 rounded-full border border-bark bg-bark px-4 py-3 text-base text-cream"
        />
        <Notice text={error} />
        {query.trim() && catalog ? (
          <View className="mb-3 gap-2">
            {catalog.products.map((product) => (
              <Pressable
                key={product.barcode}
                accessibilityRole="button"
                onPress={() => addLine("product", product.barcode, product.name)}
                className="rounded-2xl bg-paper px-3 py-3"
              >
                <Text className="font-semibold text-ink">{product.name}</Text>
                <Text className="text-sm text-mist">
                  {product.barcode} · {product.on_hand} here · {taka(product.price_from)}
                </Text>
              </Pressable>
            ))}
            {catalog.bundles.map((bundle) => (
              <Pressable
                key={bundle.name}
                accessibilityRole="button"
                onPress={() => addLine("bundle", bundle.name, bundle.name)}
                className="rounded-2xl bg-cream px-3 py-3"
              >
                <Text className="font-semibold text-ink">{bundle.name}</Text>
                <Text className="text-sm text-leaf">
                  Combo {taka(bundle.price)} · {bundle.items.join(", ")}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View className="gap-2">
          {cart.map((line) => (
            <View key={`${line.kind}-${line.key}`} className="flex-row items-center rounded-2xl bg-paper px-3 py-3">
              <View className="flex-1">
                <Text className="font-semibold text-ink">{line.name}</Text>
                <Text className="text-xs text-mist">{line.kind === "bundle" ? "Combo" : line.key}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => changeQty(line.key, line.kind, -1)} className="px-3 py-1">
                <Text className="text-xl text-ink">−</Text>
              </Pressable>
              <Text className="w-6 text-center font-bold text-ink">{line.quantity}</Text>
              <Pressable accessibilityRole="button" onPress={() => changeQty(line.key, line.kind, 1)} className="px-3 py-1">
                <Text className="text-xl text-ink">+</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {quote ? (
          <View className="mt-3 rounded-2xl bg-bark p-3">
            {quote.lines.map((line, index) => (
              <Text key={`${line.name}-${index}`} className="text-sm text-cream">
                {line.name} × {line.quantity} · {taka(line.line_total)}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 bg-ink px-4 pb-6 pt-2">
        <Button label={`Charge ${taka(total)}`} disabled={!quote} onPress={() => setStage("pay")} />
      </View>
    </SafeAreaView>
  );
}
