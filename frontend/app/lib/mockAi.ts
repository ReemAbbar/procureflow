// AI features: vendor suggestions and quote analysis.
// The browser calls our own /api/ai/* routes, which talk to Gemini on the server
// (the API key never reaches the browser). If that fails for any reason, each
// feature falls back silently to the local rule-based logic below.

import type { PurchaseRequest, RFQVendor } from './types';
import { formatCurrency } from './format';


export const SUGGEST_DELAY_MS = 1500;
export const ANALYZE_DELAY_MS = 2000;

export const simulateLatency = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------------ */
/* Feature 1: vendor suggestions                                            */
/* ------------------------------------------------------------------------ */

export type VendorSuggestion = {
  name: string;
  reason: string;
  // Estimated total for the requested quantity, in Bahraini dinars.
  priceRange: [number, number];
  // Per-unit estimate as text, e.g. "BD 380 - BD 450 per unit".
  estimatedPriceRange: string;
};

// "BD 3,800 - BD 4,200 per unit" → 4000. Strips "BD" and commas, then averages
// the two ends (a single figure is returned as-is). Null if no number is found.
export function rangeMidpoint(range: string): number | null {
  const nums = (range.replace(/BD/gi, '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) return null;
  const [lo, hi = lo] = nums;
  // Dinars have 3 decimal places (fils).
  return Math.round(((lo + hi) / 2) * 1000) / 1000;
}

type VendorProfile = {
  name: string;
  // Price band relative to the market estimate (1 = on estimate).
  band: [number, number];
  reason: (item: string) => string;
};

const IT_VENDORS: VendorProfile[] = [
  {
    name: 'Gulf IT Solutions',
    band: [0.94, 1.06],
    reason: (item) => `Local IT integrator that can supply, configure and support ${item} on site.`,
  },
  {
    name: 'Al Jazeera Electronics',
    band: [0.9, 1.02],
    reason: (item) => `Large retail stock of ${item}, typically the most competitive on unit price.`,
  },
  {
    name: 'Arabian Business Machines (ABM)',
    band: [1.0, 1.14],
    reason: (item) => `Enterprise-focused supplier offering ${item} with extended warranty and service contracts.`,
  },
];

const FACILITIES_VENDORS: VendorProfile[] = [
  {
    name: 'Al Hawaj Home Appliances',
    band: [0.92, 1.05],
    reason: (item) => `Broad showroom range and local delivery for ${item}, with corporate account pricing.`,
  },
  {
    name: 'Jashanmal Bahrain',
    band: [0.98, 1.12],
    reason: (item) => `Established retailer with consistent quality on ${item} and reliable after-sales service.`,
  },
  {
    name: 'Zain Business Solutions',
    band: [0.95, 1.08],
    reason: (item) => `Business-to-business supplier that can bundle ${item} with installation and ongoing support.`,
  },
];

const FINANCE_VENDORS: VendorProfile[] = [
  {
    name: 'Ernst & Young Bahrain',
    band: [1.0, 1.15],
    reason: (item) => `Strong regional advisory practice suited to ${item} with local regulatory expertise.`,
  },
  {
    name: 'Deloitte Middle East',
    band: [1.02, 1.18],
    reason: (item) => `Large multidisciplinary team able to scale ${item} across GCC entities.`,
  },
  {
    name: 'KPMG Bahrain',
    band: [0.95, 1.1],
    reason: (item) => `Competitive fixed-fee options for ${item} with an established Manama office.`,
  },
];

const GENERAL_VENDORS: VendorProfile[] = [
  {
    name: 'Gulf Supplies & Commercial Services',
    band: [0.9, 1.03],
    reason: (item) => `General trading supplier with fast turnaround on ${item} for corporate buyers.`,
  },
  {
    name: 'Al Moayyed International',
    band: [0.97, 1.1],
    reason: (item) => `Diversified group with wide sourcing reach, reliable for ${item} at volume.`,
  },
  {
    name: 'YBA Kanoo Bahrain',
    band: [1.0, 1.12],
    reason: (item) => `Long-standing local group offering ${item} with dependable logistics and credit terms.`,
  },
];

function vendorsFor(department?: string): VendorProfile[] {
  switch (department) {
    case 'IT':
      return IT_VENDORS;
    case 'HR':
    case 'Operations':
      return FACILITIES_VENDORS;
    case 'Finance':
      return FINANCE_VENDORS;
    default:
      return GENERAL_VENDORS;
  }
}

// Rough unit prices (BD) used only when a request has no price estimate.
const ITEM_PRICE_HINTS: [RegExp, number][] = [
  [/laptop|notebook|macbook/i, 400],
  [/monitor|screen|display/i, 95],
  [/switch|router|firewall/i, 850],
  [/server/i, 1700],
  [/printer/i, 150],
  [/phone|mobile|iphone/i, 300],
  [/chair/i, 85],
  [/desk|table|furniture/i, 150],
  [/license|licence|subscription|software/i, 110],
  [/audit|consult|advisory|review/i, 5500],
];

const estimateUnitPrice = (r: PurchaseRequest) =>
  r.estimatedPrice > 0 ? r.estimatedPrice : (ITEM_PRICE_HINTS.find(([re]) => re.test(r.itemName))?.[1] ?? 40);

// Larger orders earn a volume discount.
const volumeFactor = (qty: number) => (qty >= 100 ? 0.9 : qty >= 25 ? 0.94 : qty >= 10 ? 0.97 : 1);

// Small, stable per-item variation so different items don't produce identical ranges.
function jitter(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return 1 + ((Math.abs(h) % 7) - 3) / 100; // 0.97 – 1.03
}

// Round to a "quote-like" figure: whole fils under BD 10, otherwise 2 significant-ish digits.
export function roundPrice(value: number) {
  if (value < 10) return Math.round(value * 1000) / 1000;
  const step = value < 100 ? 1 : value < 1000 ? 5 : value < 10_000 ? 50 : 100;
  return Math.round(value / step) * step;
}

// Fallback: rule-based suggestions by department.
function mockSuggestVendors(request: PurchaseRequest): VendorSuggestion[] {
  const item = request.itemName.trim().toLowerCase() || 'these items';
  const baseTotal = estimateUnitPrice(request) * request.quantity * volumeFactor(request.quantity);

  return vendorsFor(request.department).map((v) => {
    const centre = baseTotal * jitter(v.name + request.itemName);
    const unit = centre / Math.max(request.quantity, 1);
    return {
      name: v.name,
      reason: v.reason(item),
      priceRange: [roundPrice(centre * v.band[0]), roundPrice(centre * v.band[1])],
      estimatedPriceRange: `${formatCurrency(roundPrice(unit * v.band[0]))} - ${formatCurrency(roundPrice(unit * v.band[1]))} per unit`,
    };
  });
}

/* ------------------------------------------------------------------------ */
/* Feature 2: quotation analysis (deterministic, on the real quotes)        */
/* ------------------------------------------------------------------------ */

export type QuoteAnalysis = {
  recommendedVendor: string;
  reason: string;
  insights: string[];
  riskFlag?: string;
};

type Quote = { name: string; total: number; days?: number };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const daysText = (d?: number) => (d == null ? 'no delivery estimate' : `${d} day${d === 1 ? '' : 's'}`);
// Adjective form: "a 30-day delivery".
const leadTime = (d?: number) => (d == null ? 'no delivery estimate' : `${d}-day delivery`);

// Fallback: deterministic analysis of the real quotes.
function mockAnalyzeQuotes(vendors: RFQVendor[], quantity: number): QuoteAnalysis | null {
  const quotes: Quote[] = vendors
    .filter((v) => v.status === 'quoted' && v.quotedPrice != null)
    .map((v) => ({ name: v.name, total: v.quotedPrice! * quantity, days: v.deliveryDays ?? undefined }));
  if (quotes.length === 0) return null;

  const byPrice = [...quotes].sort((a, b) => a.total - b.total);
  const cheapest = byPrice[0];
  const priciest = byPrice[byPrice.length - 1];
  const withDays = quotes.filter((q): q is Quote & { days: number } => q.days != null);
  const byDays = [...withDays].sort((a, b) => a.days - b.days);
  const fastest = byDays[0];
  const slowest = byDays[byDays.length - 1];

  // Best value = lowest total × lead time: a quote wins if its price premium
  // is smaller than its delivery advantage (in relative terms).
  const valueScore = (q: Quote & { days: number }) => q.total * Math.max(q.days, 1);
  const bestValue = [...withDays].sort((a, b) => valueScore(a) - valueScore(b) || a.total - b.total)[0];

  const cheapestTooSlow =
    cheapest.days != null && fastest != null && cheapest.days > 2 * fastest.days && bestValue != null;
  const recommended = cheapestTooSlow ? bestValue : cheapest;

  let reason: string;
  if (quotes.length === 1) {
    reason = `${cheapest.name} is the only vendor to quote: ${formatCurrency(cheapest.total)} total with ${leadTime(cheapest.days)}.`;
  } else if (cheapestTooSlow && recommended !== cheapest) {
    reason =
      `${cheapest.name} is cheapest at ${formatCurrency(cheapest.total)}, but its ${leadTime(cheapest.days)} is more than ` +
      `twice the fastest (${daysText(fastest.days)}). ${recommended.name} offers the best balance of price and lead time at ` +
      `${formatCurrency(recommended.total)} in ${daysText(recommended.days)}.`;
  } else {
    const next = byPrice[1];
    const saving = next.total - cheapest.total;
    reason =
      `${cheapest.name} has the lowest total at ${formatCurrency(cheapest.total)}, ` +
      (saving > 0
        ? `${formatCurrency(saving)} (${pct(saving, next.total)}%) below the next-best quote from ${next.name}`
        : `tied on price with ${next.name}`) +
      (cheapest.days != null ? `, with delivery in ${daysText(cheapest.days)}.` : '.');
  }

  const insights: string[] = [];

  // 1. Price spread
  if (quotes.length > 1) {
    const spread = priciest.total - cheapest.total;
    insights.push(
      spread > 0
        ? `Price spread: ${priciest.name} (${formatCurrency(priciest.total)}) is ${formatCurrency(spread)} more than ${cheapest.name} (${formatCurrency(cheapest.total)}), a ${pct(spread, cheapest.total)}% difference.`
        : `Price spread: all ${quotes.length} quotes are identical at ${formatCurrency(cheapest.total)}.`
    );
  } else {
    insights.push(`Price: ${formatCurrency(cheapest.total)} for ${quantity.toLocaleString()} units (${formatCurrency(cheapest.total / Math.max(quantity, 1))} each), with no competing bid to benchmark against.`);
  }

  // 2. Delivery
  if (withDays.length >= 2) {
    insights.push(
      fastest.days === slowest.days
        ? `Delivery: every vendor quoted ${daysText(fastest.days)}.`
        : `Delivery: ${fastest.name} is fastest at ${daysText(fastest.days)}; ${slowest.name} is slowest at ${daysText(slowest.days)} (${slowest.days - fastest.days} days longer).`
    );
  } else if (withDays.length === 1) {
    insights.push(`Delivery: only ${fastest.name} gave a lead time (${daysText(fastest.days)}). Ask the others to confirm theirs.`);
  } else {
    insights.push('Delivery: no vendor provided a lead time, so the comparison is on price only.');
  }

  // 3. Best value
  if (bestValue && withDays.length >= 2) {
    const ranked = [...withDays].sort((a, b) => valueScore(a) - valueScore(b));
    const runnerUp = ranked[1];
    insights.push(
      `Best value (total × delivery days): ${bestValue.name} scores ${formatCurrency(bestValue.total)} × ${bestValue.days} = ` +
        `${Math.round(valueScore(bestValue)).toLocaleString()}, ${pct(valueScore(runnerUp) - valueScore(bestValue), valueScore(runnerUp))}% better than ${runnerUp.name}.`
    );
  } else if (quotes.length === 1) {
    insights.push('Best value: cannot be assessed from a single quote. Invite more vendors to compare price against lead time.');
  } else {
    insights.push(`Best value: not enough delivery estimates to weigh price against lead time; lowest price is ${cheapest.name}.`);
  }

  return {
    recommendedVendor: recommended.name,
    reason,
    insights,
    riskFlag:
      quotes.length === 1
        ? 'Single quote — recommend getting more competitive bids per procurement policy'
        : undefined,
  };
}

/* ------------------------------------------------------------------------ */
/* Calls to the server AI routes (with silent fallback)                     */
/* ------------------------------------------------------------------------ */

// A little longer than the server-side Gemini timeout (30s).
const AI_TIMEOUT_MS = 35_000;

async function postAi<T>(action: 'suggest-vendors' | 'analyze-quotes', payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/ai/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `AI route failed with ${res.status}`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

// Logged in development only; users just see the fallback result.
function logFallback(feature: string, err: unknown) {
  if (process.env.NODE_ENV !== 'production') console.warn(`[ai] ${feature}: using fallback.`, err);
}

// Run the AI call, but never resolve before the minimum spinner time.
async function withMinimumDelay<T>(ms: number, task: Promise<T>): Promise<T> {
  const [result] = await Promise.all([task, simulateLatency(ms)]);
  return result;
}

export async function suggestVendors(request: PurchaseRequest): Promise<VendorSuggestion[]> {
  const { itemName, department, quantity, estimatedPrice } = request;
  const task = postAi<{ vendors?: VendorSuggestion[] }>('suggest-vendors', { itemName, department, quantity, estimatedPrice })
    .then(({ vendors }) => {
      if (!Array.isArray(vendors) || vendors.length < 3) throw new Error('Unexpected suggestion response');
      return vendors;
    })
    .catch((err) => {
      logFallback('vendor suggestions', err);
      return mockSuggestVendors(request);
    });
  return withMinimumDelay(SUGGEST_DELAY_MS, task);
}

export async function analyzeQuotes(
  vendors: RFQVendor[],
  quantity: number,
  itemName: string
): Promise<QuoteAnalysis | null> {
  // Send only what the prompt needs.
  const quotes = vendors.map(({ name, status, quotedPrice, deliveryDays, notes }) => ({
    name,
    status,
    quotedPrice,
    deliveryDays,
    notes,
  }));
  const task = postAi<{ analysis?: QuoteAnalysis }>('analyze-quotes', { vendors: quotes, quantity, itemName })
    .then(({ analysis }) => {
      if (!analysis?.recommendedVendor) throw new Error('Unexpected analysis response');
      return analysis;
    })
    .catch((err) => {
      logFallback('quote analysis', err);
      return mockAnalyzeQuotes(vendors, quantity);
    });
  return withMinimumDelay(ANALYZE_DELAY_MS, task);
}
