'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from './icons';

type Tone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: Tone };

const tones: Record<Tone, { style: string; icon: typeof InfoIcon }> = {
  success: { style: 'bg-emerald-600', icon: CheckCircleIcon },
  error: { style: 'bg-red-600', icon: XCircleIcon },
  info: { style: 'bg-blue-600', icon: InfoIcon },
};

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = ++nextId.current;
      setToasts((all) => [...all, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[70] print:hidden flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map(({ id, message, tone }) => {
          const { style, icon: ToneIcon } = tones[tone];
          return (
            <div
              key={id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${style}`}
            >
              <ToneIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 font-medium">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="rounded p-0.5 text-white/80 hover:bg-white/15 hover:text-white"
                aria-label="Dismiss notification"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
