// POST /api/ai/suggest-vendors and POST /api/ai/analyze-quotes.
// Runs on the server so the Gemini API key (GEMINI_API_KEY in .env.local) is
// never exposed to the browser. Any non-2xx response makes the client fall
// back to its local rule-based logic.

import {
  geminiAnalyzeQuotes,
  geminiConfigured,
  geminiSuggestVendors,
  type QuoteInput,
  type SuggestInput,
} from '../../../lib/gemini';
import { DEPARTMENTS, type Department, type QuoteStatus } from '../../../lib/types';

const MAX_TEXT = 300;
const MAX_VENDORS = 10;

const text = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// Only the fields the prompts use are accepted, and strings are capped, so the
// route can't be used as a general-purpose proxy for the API key.
function parseSuggest(body: unknown): SuggestInput | null {
  if (!isRecord(body)) return null;
  const itemName = text(body.itemName);
  const quantity = num(body.quantity);
  if (!itemName || !quantity) return null;
  const department = DEPARTMENTS.includes(body.department as Department) ? (body.department as Department) : undefined;
  return { itemName, quantity, department, estimatedPrice: num(body.estimatedPrice) ?? 0 };
}

const QUOTE_STATUSES: QuoteStatus[] = ['pending', 'quoted', 'declined'];

function parseAnalyze(body: unknown): { vendors: QuoteInput[]; quantity: number; itemName: string } | null {
  if (!isRecord(body) || !Array.isArray(body.vendors)) return null;
  const quantity = num(body.quantity);
  const itemName = text(body.itemName) ?? 'Requested item';
  if (!quantity) return null;
  const vendors = body.vendors.slice(0, MAX_VENDORS).flatMap((v): QuoteInput[] => {
    if (!isRecord(v)) return [];
    const name = text(v.name, 120);
    const status = QUOTE_STATUSES.includes(v.status as QuoteStatus) ? (v.status as QuoteStatus) : null;
    if (!name || !status) return [];
    return [
      {
        name,
        status,
        quotedPrice: num(v.quotedPrice) ?? undefined,
        deliveryDays: num(v.deliveryDays) ?? undefined,
        notes: text(v.notes) ?? undefined,
      },
    ];
  });
  return vendors.length ? { vendors, quantity, itemName } : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== 'suggest-vendors' && action !== 'analyze-quotes') {
    return Response.json({ error: 'Unknown AI action' }, { status: 404 });
  }
  if (!geminiConfigured()) {
    return Response.json({ error: 'AI is not configured (set GEMINI_API_KEY)' }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);

  try {
    if (action === 'suggest-vendors') {
      const input = parseSuggest(body);
      if (!input) return Response.json({ error: 'itemName and quantity are required' }, { status: 400 });
      return Response.json({ vendors: await geminiSuggestVendors(input) });
    }

    const input = parseAnalyze(body);
    if (!input) return Response.json({ error: 'vendors and quantity are required' }, { status: 400 });
    return Response.json({ analysis: await geminiAnalyzeQuotes(input.vendors, input.quantity, input.itemName) });
  } catch (err) {
    // Details stay in the server log; the client only needs to know to fall back.
    console.error(`[api/ai/${action}]`, err);
    return Response.json({ error: 'AI request failed' }, { status: 502 });
  }
}
