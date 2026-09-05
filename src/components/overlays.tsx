'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { IconClose } from './icons';
import { Button, cx } from './ui';

/**
 * Overlay primitives: Drawer, Modal and Toast.
 *
 * All three share the same accessibility contract, because getting it right once is the only way it
 * stays right: focus moves in on open and returns to the trigger on close, focus is trapped while
 * open, Escape closes, the page behind cannot scroll, and the container is labelled.
 */

/** Traps Tab within a container, restores focus on unmount, and closes on Escape. */
function useDialogBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    // Stop the page behind scrolling, without the width jump that removing the scrollbar causes.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

/**
 * A right-hand drawer.
 *
 * Used for task detail. Opening a task in a drawer rather than navigating away keeps the list
 * underneath it — you can read a task, close it, and still be looking at the same filtered set at
 * the same scroll position, which is the whole point when triaging.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg';
}) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-[rgb(10_10_14/0.4)] opacity-0 [animation:fade-rise_180ms_ease-out_forwards]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Details'}
        className={cx(
          'relative flex h-full flex-col border-l border-line bg-surface shadow-e3',
          'translate-x-full [animation:drawer-in_260ms_cubic-bezier(0.22,1,0.36,1)_forwards]',
          width === 'lg' ? 'w-full max-w-[620px]' : 'w-full max-w-[460px]',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-1 text-xs text-ink-2">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <IconClose />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * A modal, reserved for destructive confirmation.
 *
 * Deliberately small and deliberately rare. Workflows belong on pages or in drawers; a modal is for
 * a question that must be answered before anything else happens.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  tone = 'danger',
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  pending?: boolean;
}) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-[rgb(10_10_14/0.45)]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop relative w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-e3"
      >
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-2">{body}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button tone="secondary" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button tone={tone} size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toast */

export type Toast = { id: number; tone: 'good' | 'danger' | 'info'; message: string };

/**
 * Toasts, kept deliberately dumb: a list, a timer, an aria-live region.
 *
 * Used for the outcome of an action that does not change what is on screen — "Alert dismissed", for
 * instance. Anything the user needs to read carefully, like which tasks a bulk operation refused,
 * belongs in the page rather than in something that disappears.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = (tone: Toast['tone'], message: string) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  return { toasts, push, dismiss: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)) };
}

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-pop pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm shadow-e2',
            t.tone === 'good' && 'border-good-line bg-good-soft text-good',
            t.tone === 'danger' && 'border-danger-line bg-danger-soft text-danger',
            t.tone === 'info' && 'border-line bg-surface text-ink',
          )}
        >
          <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="-mr-1 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
