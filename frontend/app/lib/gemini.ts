// Server-only Gemini client. The API key is read from GEMINI_API_KEY (.env.local)
// and this module can't be imported into client code, so the key never ships to
// the browser. Callers: app/api/ai/[action]/route.ts.

import 'server-only';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { PurchaseRequest, RFQVendor } from './types';
import { formatCurrency } from './format';
import { roundPrice, type QuoteAnalysis, type VendorSuggestion } from './mockAi';

// gemini-1.5-flash has been shut down; this is Google's current recommended Flash model.
const MODEL = 'gemini-3.8-flash';
// Responses typically take 15–20s, so allow headroom before giving up and falling back.
const GEMINI_TIMEOUT_MS = 30_000;

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim());

let client: GoogleGenAI | null = null;

async function askGemini(prompt: string): Promise<string> {
  // One retry covers brief "high demand" 503s without blowing the time budget.
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 1 } },
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        // These are short structured answers; low thinking roughly halves the latency.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: controller.signal,
      },
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Gemini sometimes wraps JSON in ```json fences or adds stray text around it.
export function parseModelJson(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('No JSON object in response');
    return JSON.parse(stripped.slice(start, end + 1));
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/* Feature 1: vendor suggestions ------------------------------------------ */

// "BD 1,250 - BD 1,400 per unit" → [1250, 1400]
function parseUnitRange(text: string): [number, number] | null {
  const nums = (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => n > 0);
  if (nums.length === 0) return null;
  const [a, b = a] = nums;
  return [Math.min(a, b), Math.max(a, b)];
}

export type SuggestInput = Pick<PurchaseRequest, 'itemName' | 'department' | 'quantity' | 'estimatedPrice'>;

export async function geminiSuggestVendors(request: SuggestInput): Promise<VendorSuggestion[]> {
  const unitBudget = request.estimatedPrice.toFixed(3);
  const prompt = `You are a procurement assistant for a company in Bahrain.
The company needs to purchase: ${request.itemName}
Department: ${request.department ?? 'Not specified'}
Quantity: ${request.quantity}
Estimated budget: BD ${unitBudget} per unit

Suggest 3 realistic vendors that operate in Bahrain or the GCC region.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "vendors": [
    {
      "name": "vendor name",
      "reason": "one sentence why good for this item",
      "estimatedPriceRange": "BD XXX - BD XXX per unit"
    }
  ]
}`;

  const data = parseModelJson(await askGemini(prompt));
  const vendors = isRecord(data) && Array.isArray(data.vendors) ? data.vendors : [];
  const suggestions = vendors.flatMap((v): VendorSuggestion[] => {
    if (!isRecord(v) || !nonEmpty(v.name) || !nonEmpty(v.reason) || !nonEmpty(v.estimatedPriceRange)) return [];
    const unit = parseUnitRange(v.estimatedPriceRange);
    if (!unit) return [];
    // The UI shows an estimated total for the requested quantity.
    const total: [number, number] = [roundPrice(unit[0] * request.quantity), roundPrice(unit[1] * request.quantity)];
    return [
      { name: v.name.trim(), reason: v.reason.trim(), priceRange: total, estimatedPriceRange: v.estimatedPriceRange.trim() },
    ];
  });
  if (suggestions.length < 3) throw new Error(`Expected 3 vendors, got ${suggestions.length}`);
  return suggestions.slice(0, 3);
}

/* Feature 2: quote analysis ---------------------------------------------- */

const SINGLE_QUOTE_RISK = 'Single quote — recommend getting more competitive bids per procurement policy';

export type QuoteInput = Pick<RFQVendor, 'name' | 'status' | 'quotedPrice' | 'deliveryDays' | 'notes'>;

export async function geminiAnalyzeQuotes(vendors: QuoteInput[], quantity: number, itemName: string): Promise<QuoteAnalysis> {
  const quoted = vendors.filter((v) => v.status === 'quoted' && v.quotedPrice != null);
  if (quoted.length === 0) throw new Error('No quotes to analyze');

  const lines = vendors.map((v) =>
    v.status === 'quoted' && v.quotedPrice != null
      ? `- Name: ${v.name}, Price per unit: ${formatCurrency(v.quotedPrice)}, Total: ${formatCurrency(v.quotedPrice * quantity)}, ` +
        `Delivery: ${v.deliveryDays != null ? `${v.deliveryDays} days` : 'not provided'}, Notes: ${v.notes?.trim() || 'none'}`
      : `- Name: ${v.name}, ${v.status === 'declined' ? 'declined to quote' : 'no quote received yet'}`
  );

  const prompt = `You are a procurement analyst for a company in Bahrain.
Item: ${itemName}, Quantity: ${quantity}
Vendor quotes received:
${lines.join('\n')}

Analyze these quotes and recommend the best vendor.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "recommendation": "vendor name",
  "reason": "2-3 sentences explaining why",
  "insights": [
    "insight about price comparison",
    "insight about delivery times",
    "insight about overall value"
  ],
  "riskFlag": "any concern or null"
}`;

  const data = parseModelJson(await askGemini(prompt));
  if (!isRecord(data) || !nonEmpty(data.recommendation) || !nonEmpty(data.reason)) {
    throw new Error('Missing recommendation or reason');
  }
  // The recommendation must be one of the vendors that actually quoted.
  const pick = data.recommendation.trim().toLowerCase();
  const vendor =
    quoted.find((v) => v.name.trim().toLowerCase() === pick) ??
    quoted.find((v) => pick.includes(v.name.trim().toLowerCase()) || v.name.trim().toLowerCase().includes(pick));
  if (!vendor) throw new Error(`Recommended vendor "${data.recommendation}" did not quote`);

  const insights = Array.isArray(data.insights) ? data.insights.filter(nonEmpty).map((i) => i.trim()).slice(0, 3) : [];
  if (insights.length === 0) throw new Error('No insights');

  const risk = nonEmpty(data.riskFlag) && data.riskFlag.trim().toLowerCase() !== 'null' ? data.riskFlag.trim() : undefined;

  return {
    recommendedVendor: vendor.name,
    reason: data.reason.trim(),
    insights,
    // Procurement policy: a single quote is always flagged, whatever the model says.
    riskFlag: risk ?? (quoted.length === 1 ? SINGLE_QUOTE_RISK : undefined),
  };
}
