'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Theme handling.
 *
 * Three states, not two: light, dark, and "follow the system", which is the default. An internal
 * tool gets opened at 09:00 and at 23:00 and should not need to be told twice.
 *
 * The chosen theme is written to `data-theme` on <html> by an inline script that runs before first
 * paint (see the root layout), so there is no flash of the wrong theme on load.
 */
export type Theme = 'light' | 'dark' | 'system';

const KEY = 'cadence-theme';

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Runs before paint. Kept as a string so it can be inlined into <head>. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="8" cy="8" r="3.1" />
        <path strokeLinecap="round" d="M8 1.4v1.6M8 13v1.6M14.6 8H13M3 8H1.4M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1.8" y="2.6" width="12.4" height="8.4" rx="1.4" />
        <path strokeLinecap="round" d="M5.6 13.4h4.8" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path strokeLinejoin="round" d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.8 5.8 0 1 0 7 7Z" />
      </svg>
    ),
  },
];

const CHANGED = 'cadence-theme-change';

/**
 * The stored preference is external state that React does not own, so it is read through
 * `useSyncExternalStore` rather than copied into an effect. That gets the server snapshot right
 * (always "system", which is what the pre-paint script assumes) and avoids the extra render an
 * effect-plus-setState would cost on every mount.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange); // another tab changed it
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readStored(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme | null) ?? 'system';
  } catch {
    return 'system';
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readStored, () => 'system' as Theme);

  // Keep "system" honest if the OS flips while the tab is open. This only touches the DOM, so it is
  // a genuine effect rather than state being mirrored.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readStored() === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const choose = (next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private browsing. The choice still applies to this page.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGED));
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg bg-sunk p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            title={option.label}
            /*
             * The server cannot know which theme this viewer picked — it lives in their
             * localStorage — so the server snapshot is always "system" and the first client render
             * may legitimately disagree about which button is selected. That is a real difference,
             * not a bug, and it is confined to this control's own attributes.
             */
            suppressHydrationWarning
            onClick={() => choose(option.value)}
            className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
              active
                ? 'bg-surface text-ink shadow-e1'
                : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {option.icon}
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
