import { api } from "./client";

export type Preorder = {
  reorder_level: number;
  lead_days: number;
  notify_enabled: boolean;
  overrides: {
    reorder_level: boolean;
    lead_days: boolean;
    notify_enabled: boolean;
  };
};

export type ProductRow = {
  barcode: string;
  name: string;
  image: string | null;
  quantity: number;
  locations: { name: string; quantity: number }[];
  selling_from: string | null;
  selling_to: string | null;
  mrp_from: string | null;
  mrp_to: string | null;
  soonest_expiry: string | null;
  low_stock: boolean;
  expiring: boolean;
  bundle_names: string[];
  preorder: Preorder;
};

export type Lot = {
  manufacturing_date: string;
  expiry_date: string;
  mrp: string;
  purchase_rate: string;
  discount_rate: string;
  selling_price: string;
  origin: string;
  location: string;
  quantity: number;
};

export type ProductDetail = ProductRow & { lots: Lot[] };

export type Place = { name: string; kind: "warehouse" | "shop" | "other" };

export type BundleItem = { barcode: string; name: string; quantity: number };

export type Bundle = {
  name: string;
  price: string;
  active: boolean;
  items: BundleItem[];
};

export type StoreSettings = {
  store_name: string;
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  payment_timeout_seconds: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  sms_template: string;
  receipt_base_url: string;
  sms_mechanism: string;
  email_mechanism: string;
};

export type PaymentConfig = {
  store_name: string;
  timeout_seconds: number;
  wallets: { bkash: string; nagad: string; rocket: string };
  sms_enabled: boolean;
  email_enabled: boolean;
};

export type QuoteLine = {
  kind: string;
  name: string;
  barcode: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  detail: string;
};

export type Quote = { location: string; total: string; lines: QuoteLine[] };

export type SaleResult = Quote & {
  number: string;
  created_at: string;
  payment_method: string;
  amount_taken: string;
  change: string;
  txn_number: string;
  receipt_text: string;
  receipt_html: string;
  receipt_url: string;
  delivery: {
    sms: { sent: boolean; detail?: string; body?: string; to?: string; mechanism?: string };
    email: { sent: boolean; detail?: string; to?: string; mechanism?: string };
    receipt_url: string;
  };
};

export type Catalog = {
  products: {
    kind: "product";
    barcode: string;
    name: string;
    image: string | null;
    on_hand: number;
    price_from: string | null;
  }[];
  bundles: { kind: "bundle"; name: string; price: string; items: string[] }[];
};

export type VendorRow = {
  name: string;
  phone: string;
  purchased: string;
  paid: string;
  balance: string;
};

export type Accounting = {
  today: { date: string; count: number; sales_total: string; profit: string } | null;
  vendors: VendorRow[] | null;
  partners: {
    shares: { name: string; share: string; amount: string }[];
    shop_share: string;
    shop_amount: string;
  } | null;
  loans: {
    id: number;
    borrower: string;
    amount: string;
    collected: string;
    outstanding: string;
    opened_on: string;
    due_on: string;
    note: string;
    overdue: boolean;
  }[] | null;
};

export type Summary = {
  preset: string;
  start: string;
  end: string;
  count: number;
  sales_total: string;
  profit: string;
  sales: { number: string; created_at: string; total: string; payment_method: string; location: string }[];
  depleted: {
    barcode: string;
    name: string;
    quantity: number;
    reorder_level: number;
    locations: { name: string; quantity: number }[];
  }[];
};

export type Capability = { code: string; group: string; label: string };

export type ManagerAccess = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  capabilities: string[];
};

export function fetchProducts(query = "") {
  return api.get<ProductRow[]>("/api/inventory/products/", { params: { q: query } });
}

export function fetchProduct(barcode: string) {
  return api.get<ProductDetail>(`/api/inventory/products/${encodeURIComponent(barcode)}/`);
}

export function receiveStock(payload: Record<string, string | number>) {
  return api.post<ProductDetail>("/api/inventory/receive/", payload, { timeout: 30000 });
}

export function updatePreorder(barcode: string, payload: Record<string, number | boolean | null>) {
  return api.patch<ProductDetail>(`/api/inventory/products/${encodeURIComponent(barcode)}/`, payload);
}

export function fetchPlaces() {
  return api.get<Place[]>("/api/inventory/locations/");
}

export function createPlace(name: string, kind: Place["kind"]) {
  return api.post<Place>("/api/inventory/locations/", { name, kind });
}

export function deletePlace(name: string) {
  return api.delete(`/api/inventory/locations/${encodeURIComponent(name)}/`);
}

export function fetchBundles() {
  return api.get<Bundle[]>("/api/inventory/bundles/");
}

export function createBundle(payload: { name: string; price: string; items: { barcode: string; quantity: number }[] }) {
  return api.post<Bundle>("/api/inventory/bundles/", payload);
}

export function deleteBundle(name: string) {
  return api.delete(`/api/inventory/bundles/${encodeURIComponent(name)}/`);
}

export function fetchPreorderDefaults() {
  return api.get<{ reorder_level: number; lead_days: number; notify_enabled: boolean }>("/api/inventory/preorder/");
}

export function savePreorderDefaults(payload: { reorder_level: number; lead_days: number; notify_enabled: boolean }) {
  return api.patch("/api/inventory/preorder/", payload);
}

export function fetchStoreSettings() {
  return api.get<StoreSettings>("/api/store/settings/");
}

export function saveStoreSettings(payload: Partial<StoreSettings>) {
  return api.patch<StoreSettings>("/api/store/settings/", payload);
}

export function fetchCatalog(query: string, location: string) {
  return api.get<Catalog>("/api/sales/catalog/", { params: { q: query, location } });
}

export function fetchPaymentConfig() {
  return api.get<PaymentConfig>("/api/sales/payment-config/");
}

export function quoteSale(location: string, lines: { barcode?: string; bundle?: string; quantity: number }[]) {
  return api.post<Quote>("/api/sales/quote/", { location, lines });
}

export function checkoutSale(payload: {
  location: string;
  lines: { barcode?: string; bundle?: string; quantity: number }[];
  payment: { method: string; amount_taken: string; txn_number?: string };
  customer_phone?: string;
  customer_email?: string;
}) {
  return api.post<SaleResult>("/api/sales/checkout/", payload);
}

export function parseSms(text: string) {
  return api.post<{ amount: string; txn_number: string }>("/api/sales/parse-sms/", { text });
}

export function fetchAccounting() {
  return api.get<Accounting>("/api/accounting/");
}

export function payVendor(payload: { vendor: string; amount: string; paid_on: string; note?: string; phone?: string }) {
  return api.post("/api/accounting/payments/", payload);
}

export function savePartner(name: string, share: string) {
  return api.post("/api/accounting/partners/", { name, share });
}

export function removePartner(name: string) {
  return api.delete(`/api/accounting/partners/${encodeURIComponent(name)}/`);
}

export function createLoan(payload: {
  borrower: string;
  amount: string;
  opened_on: string;
  due_on: string;
  note?: string;
}) {
  return api.post("/api/accounting/loans/", payload);
}

export function collectLoan(id: number, amount: string) {
  return api.post(`/api/accounting/loans/${id}/collect/`, { amount });
}

export function fetchSummary(params: Record<string, string>) {
  return api.get<Summary>("/api/summary/", { params });
}

export function fetchCapabilityCatalog() {
  return api.get<Capability[]>("/api/access/catalog/");
}

export function fetchManagerAccess() {
  return api.get<ManagerAccess[]>("/api/access/managers/");
}

export function saveManagerAccess(id: number, capabilities: string[]) {
  return api.put<{ id: number; capabilities: string[] }>(`/api/access/managers/${id}/`, { capabilities });
}
