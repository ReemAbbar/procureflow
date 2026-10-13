export const API_URL = 'http://localhost:5000';

// Fetches JSON from the backend, throwing an Error with the server's message on failure.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error(`Could not reach ${API_URL}. Is the backend running?`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed with ${res.status}`);
  return body as T;
}

// Lets independent parts of the UI (sidebar badge, notification bell) refresh
// after a mutation elsewhere, without a global store.
const CHANGE_EVENT = 'procureflow:data-changed';

export function emitDataChanged() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onDataChanged(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}
