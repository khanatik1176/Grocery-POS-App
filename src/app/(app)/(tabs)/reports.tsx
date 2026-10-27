import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";

import { apiError } from "@/api/client";
import { fetchSaleHistory, fetchSummary, type SaleHistory, type SaleRow, type Summary } from "@/api/pos";
import { BarChart } from "@/components/BarChart";
import { DateField } from "@/components/DateField";
import { ListSkeleton, StatsSkeleton } from "@/components/skeleton";
import { Badge, Banner, Button, Card, Chip, ChipRow, COLORS, EmptyState, ErrorState, Icon, Page, SearchBar, SectionTitle, Segmented, ShowMore, Stat } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { useShowMore } from "@/hooks/usePaged";
import { addDays, daysUntil, PAYMENT_LABELS, prettyDate, prettyTime, shortDate, taka, takaShort, todayIso } from "@/pos/format";

type Tab = "overview" | "sales" | "products" | "stock";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "sales", label: "Sales" },
  { value: "products", label: "Products" },
  { value: "stock", label: "Stock" },
];

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "date", label: "Pick a day" },
  { id: "week", label: "This week" },
  { id: "week_range", label: "Week range" },
  { id: "month", label: "This month" },
  { id: "days30", label: "Last 30 days" },
  { id: "range", label: "Custom" },
];

const METHODS = ["", "cash", "card", "bkash", "nagad", "rocket"];

export default function Reports() {
  const [tab, setTab] = useState<Tab>("overview");
  const [preset, setPreset] = useState("today");
  const [date, setDate] = useState(todayIso());
  const [start, setStart] = useState(addDays(todayIso(), -13));
  const [end, setEnd] = useState(todayIso());

  const ranged = preset === "week_range" || preset === "range";
  const params: Record<string, string> = { preset };
  if (preset === "date") params.date = date;
  if (ranged) Object.assign(params, { start, end });

  const summary = useLoad(() => fetchSummary(params), [preset, date, start, end]);
  const data = summary.data;

  return (
    <Page refreshControl={<RefreshControl refreshing={summary.refreshing} onRefresh={() => void summary.refresh()} colors={[COLORS.brand]} />}>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab !== "stock" ? (
        <>
          <ChipRow>
            {PRESETS.map((item) => (
              <Chip key={item.id} label={item.label} selected={preset === item.id} onPress={() => setPreset(item.id)} />
            ))}
          </ChipRow>
          {preset === "date" ? <DateField label="Day" value={date} onChange={setDate} maximumDate={new Date()} /> : null}
          {ranged ? (
            <View className="flex-row gap-3">
              <DateField label="From" value={start} onChange={setStart} />
              <DateField label="To" value={end} onChange={setEnd} />
            </View>
          ) : null}
          {ranged && end < start ? <Banner tone="warn" text="The end date is before the start date." /> : null}
          {data ? (
            <Text className="px-1 text-sm text-muted">
              {prettyDate(data.start)}
              {data.start !== data.end ? ` – ${prettyDate(data.end)}` : ""}
            </Text>
          ) : null}
        </>
      ) : null}

      {tab !== "sales" && summary.error && !data ? null : <Banner text={summary.error} />}

      {tab === "sales" ? (
        <SalesRegister params={params} />
      ) : summary.error && !data ? (
        <ErrorState message={summary.error} onRetry={() => void summary.reload()} />
      ) : summary.loading || !data ? (
        <>
          <StatsSkeleton />
          <ListSkeleton rows={4} thumb={false} />
        </>
      ) : (
        <View style={{ gap: 12, opacity: summary.pending ? 0.55 : 1 }}>
          {summary.pending ? <ActivityIndicator color={COLORS.brand} /> : null}
          {tab === "overview" ? <Overview data={data} onSeeSales={() => setTab("sales")} /> : tab === "products" ? <Products data={data} /> : <Stock data={data} />}
        </View>
      )}
    </Page>
  );
}

function Overview({ data, onSeeSales }: { data: Summary; onSeeSales: () => void }) {
  const best = [...data.by_day].sort((a, b) => Number(b.total) - Number(a.total))[0];
  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Sales" value={taka(data.sales_total)} icon="trending-up" tone="brand" />
        <Stat
          label="Gross profit"
          value={taka(data.profit)}
          sub={Number(data.sales_total) > 0 ? `${Math.round((Number(data.profit) / Number(data.sales_total)) * 100)}% margin` : undefined}
          icon="sparkles-outline"
          tone="info"
        />
        <Stat label="Transactions" value={String(data.count)} icon="receipt-outline" />
        <Stat label="Average sale" value={taka(data.average)} icon="calculator-outline" />
      </View>

      {data.by_day.length > 1 ? (
        <>
          <SectionTitle title="Daily sales" />
          <Card className="p-4">
            <BarChart
              label="Daily sales"
              format={(value) => taka(value)}
              data={data.by_day.map((day) => ({ key: day.date, value: Number(day.total), label: shortDate(day.date) }))}
            />
            <View className="mt-3 flex-row justify-between">
              <Text className="text-xs text-muted">Best day</Text>
              <Text className="text-xs font-semibold text-ink">{best && Number(best.total) > 0 ? `${shortDate(best.date)} · ${takaShort(best.total)}` : "—"}</Text>
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle title="Payment methods" />
      {data.by_method.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No sales in this period" />
      ) : (
        <Card className="gap-3 p-4">
          {data.by_method.map((row) => {
            const share = Number(data.sales_total) > 0 ? Number(row.total) / Number(data.sales_total) : 0;
            return (
              <View key={row.method} className="gap-1.5">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-medium text-ink">
                    {row.label} <Text className="text-muted">· {row.count}</Text>
                  </Text>
                  <Text className="text-sm font-semibold text-ink">
                    {taka(row.total)} <Text className="font-normal text-muted">({Math.round(share * 100)}%)</Text>
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-line">
                  <View style={{ width: `${share * 100}%` }} className="h-full rounded-full bg-brand" />
                </View>
              </View>
            );
          })}
        </Card>
      )}
      {data.count > 0 ? <Button label={`View all ${data.count} sales`} icon="list-outline" variant="secondary" onPress={onSeeSales} /> : null}
    </>
  );
}

function SalesRegister({ params }: { params: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [needle, setNeedle] = useState("");
  const [method, setMethod] = useState("");
  const [history, setHistory] = useState<SaleHistory | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify({ ...params, method, q: needle });

  useEffect(() => {
    const handle = setTimeout(() => setNeedle(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Each change of period, method, or search starts the register again from page 1.
  useEffect(() => {
    let active = true;
    fetchSaleHistory({ ...JSON.parse(filterKey), page: "1" })
      .then((response) => {
        if (!active) return;
        setHistory(response.data);
        setRows(response.data.results);
        setLoadedKey(filterKey);
        setError(null);
      })
      .catch((err) => active && setError(apiError(err)));
    return () => {
      active = false;
    };
  }, [filterKey]);

  async function loadMore() {
    if (!history || history.page >= history.pages) return;
    setLoadingMore(true);
    try {
      const response = await fetchSaleHistory({ ...JSON.parse(filterKey), page: String(history.page + 1) });
      setHistory(response.data);
      setRows((current) => [...current, ...response.data.results]);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  // Older results stay visible, dimmed, while a new filter loads.
  const stale = history !== null && loadedKey !== filterKey;

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Receipt no., product, phone, or txn ID" />
      <ChipRow>
        {METHODS.map((id) => (
          <Chip key={id || "all"} label={id ? PAYMENT_LABELS[id] : "All methods"} selected={method === id} onPress={() => setMethod(id)} />
        ))}
      </ChipRow>
      <Banner text={error} />
      {history === null ? (
        <ListSkeleton rows={6} thumb={false} />
      ) : (
        <>
          <Card className="flex-row p-0">
            <View className="flex-1 p-3">
              <Text className="text-xs text-muted">Sales</Text>
              <Text className="text-lg font-bold text-ink">{history.count}</Text>
            </View>
            <View className="flex-1 border-l border-line p-3">
              <Text className="text-xs text-muted">Revenue</Text>
              <Text className="text-lg font-bold text-ink" numberOfLines={1} adjustsFontSizeToFit>
                {taka(history.sales_total)}
              </Text>
            </View>
            <View className="flex-1 border-l border-line p-3">
              <Text className="text-xs text-muted">Profit</Text>
              <Text className="text-lg font-bold text-brand-dark" numberOfLines={1} adjustsFontSizeToFit>
                {taka(history.profit)}
              </Text>
            </View>
          </Card>
          {rows.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No sales found" body={needle || method ? "Try a different search or method." : "Sales in this period will be listed here."} />
          ) : (
            <Card className={`overflow-hidden ${stale ? "opacity-60" : ""}`}>
              {rows.map((sale, index) => (
                <Pressable
                  key={sale.number}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/sale/[number]", params: { number: sale.number } })}
                  className={`flex-row items-center gap-3 px-4 py-3 active:bg-canvas ${index < rows.length - 1 ? "border-b border-line" : ""}`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-ink">#{sale.number}</Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {prettyTime(sale.created_at)} · {sale.items} item{sale.items === 1 ? "" : "s"} · {sale.location}
                      {sale.cashier ? ` · ${sale.cashier}` : ""}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-ink">{taka(sale.total)}</Text>
                    <Badge label={PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method} />
                  </View>
                  <Icon name="chevron-forward" size={16} color={COLORS.faint} />
                </Pressable>
              ))}
            </Card>
          )}
          {history.page < history.pages ? (
            <Button label={`Load more (${history.count - rows.length} left)`} variant="secondary" busy={loadingMore} onPress={() => void loadMore()} />
          ) : rows.length > 0 ? (
            <Text className="text-center text-xs text-muted">All {history.count} sales shown</Text>
          ) : null}
        </>
      )}
      {stale ? <ActivityIndicator color={COLORS.brand} /> : null}
    </>
  );
}

function Products({ data }: { data: Summary }) {
  const pages = useShowMore(data.top_products);
  if (data.top_products.length === 0) {
    return <EmptyState icon="cube-outline" title="Nothing sold in this period" />;
  }
  const max = Math.max(...data.top_products.map((item) => Number(item.total)));
  const units = data.top_products.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Units sold" value={String(units)} icon="cube-outline" tone="brand" />
        <Stat label="Products & combos" value={String(data.top_products.length)} icon="pricetags-outline" />
      </View>
      <SectionTitle title="Top sellers by revenue" />
      <Card className="overflow-hidden">
        {pages.visible.map((item, index, all) => (
          <View key={`${item.kind}-${item.name}`} className={`gap-1.5 px-4 py-3 ${index < all.length - 1 ? "border-b border-line" : ""}`}>
            <View className="flex-row items-center gap-3">
              <Text className="w-5 text-sm font-semibold text-muted">{index + 1}</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-ink">{item.name}</Text>
                <Text className="text-xs text-muted">
                  {item.quantity} sold{item.kind === "bundle" ? " · combo" : ""}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-ink">{taka(item.total)}</Text>
            </View>
            <View className="ml-8 h-1.5 overflow-hidden rounded-full bg-line">
              <View style={{ width: `${max > 0 ? (Number(item.total) / max) * 100 : 0}%` }} className="h-full rounded-full bg-brand" />
            </View>
          </View>
        ))}
      </Card>
      <ShowMore remaining={pages.remaining} onPress={pages.showMore} noun="products" />
    </>
  );
}

function Stock({ data }: { data: Summary }) {
  const buy = useShowMore(data.depleted);
  const expiring = useShowMore(data.expiring);
  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Buy soon" value={String(data.depleted.length)} icon="trending-down" tone={data.depleted.length ? "warn" : "brand"} />
        <Stat label="Expiring soon" value={String(data.expiring.length)} icon="time-outline" tone={data.expiring.length ? "danger" : "brand"} />
      </View>

      <SectionTitle title="Buy soon" />
      {data.depleted.length === 0 ? (
        <Card className="flex-row items-center gap-3 p-4">
          <Icon name="checkmark-circle" size={22} color={COLORS.brand} />
          <Text className="flex-1 text-sm text-body">Every product is above its reorder threshold.</Text>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {buy.visible.map((item, index, all) => (
            <Pressable
              key={item.barcode}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/product/[barcode]", params: { barcode: item.barcode } })}
              className={`flex-row items-center gap-3 px-4 py-3 active:bg-canvas ${index < all.length - 1 ? "border-b border-line" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-base font-medium text-ink">{item.name}</Text>
                <Text className="text-xs text-muted">
                  Reorder at {item.reorder_level}
                  {item.locations.length ? ` · ${item.locations.map((spot) => `${spot.name} ${spot.quantity}`).join(" · ")}` : ""}
                </Text>
              </View>
              <Badge
                label={item.quantity === 0 ? "Out" : `${item.quantity} left`}
                tone={item.quantity === 0 ? "danger" : "warn"}
                icon={item.quantity === 0 ? "alert-circle" : "trending-down"}
              />
            </Pressable>
          ))}
        </Card>
      )}
      <ShowMore remaining={buy.remaining} onPress={buy.showMore} noun="products" />

      <SectionTitle title="Expiring soon" />
      {data.expiring.length === 0 ? (
        <Card className="flex-row items-center gap-3 p-4">
          <Icon name="checkmark-circle" size={22} color={COLORS.brand} />
          <Text className="flex-1 text-sm text-body">Nothing in stock is close to expiry.</Text>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {expiring.visible.map((item, index, all) => {
            const days = item.soonest_expiry ? daysUntil(item.soonest_expiry) : 0;
            return (
              <Pressable
                key={item.barcode}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/product/[barcode]", params: { barcode: item.barcode } })}
                className={`flex-row items-center gap-3 px-4 py-3 active:bg-canvas ${index < all.length - 1 ? "border-b border-line" : ""}`}
              >
                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{item.name}</Text>
                  <Text className="text-xs text-muted">
                    {item.quantity} in stock · {prettyDate(item.soonest_expiry)}
                  </Text>
                </View>
                <Badge label={days < 0 ? "Expired" : `${days}d left`} tone="danger" icon="time-outline" />
              </Pressable>
            );
          })}
        </Card>
      )}
      <ShowMore remaining={expiring.remaining} onPress={expiring.showMore} noun="products" />
    </>
  );
}
