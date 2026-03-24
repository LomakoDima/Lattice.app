import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

type ToastContextValue = {
  showUndoToast: (message: string, onUndo: () => void) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_MS = 8500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    undoRef.current = null;
    setToast(null);
  }, [clearTimer]);

  const showUndoToast = useCallback(
    (message: string, onUndo: () => void) => {
      clearTimer();
      undoRef.current = onUndo;
      setToast({ id: Date.now(), message });
      timerRef.current = setTimeout(() => {
        undoRef.current = null;
        setToast(null);
        timerRef.current = null;
      }, TOAST_MS);
    },
    [clearTimer],
  );

  const handleUndo = useCallback(() => {
    const fn = undoRef.current;
    dismiss();
    fn?.();
  }, [dismiss]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <ToastContext.Provider value={{ showUndoToast }}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center p-4 sm:p-6"
          role="status"
          aria-live="polite"
        >
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-nexus-ink/95 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md animate-toast-slide-up motion-reduce:animate-none motion-reduce:opacity-100"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-neutral-200">{toast.message}</p>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                className="shrink-0 gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
                onClick={handleUndo}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </Button>
            </div>
            <div className="h-1 w-full bg-white/[0.06]" aria-hidden>
              <div
                className="h-full w-full origin-left bg-gradient-to-r from-nexus-accent-dim to-nexus-accent animate-toast-progress motion-reduce:animate-none motion-reduce:scale-x-100"
                style={{ animationDuration: `${TOAST_MS}ms` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
