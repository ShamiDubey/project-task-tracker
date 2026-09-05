/**
 * A small, consistent icon set drawn at a single stroke weight on a 16px grid.
 *
 * Hand-rolled rather than pulled from a library: nine icons is not worth a dependency, and drawing
 * them here means they inherit `currentColor` and one stroke width, so nothing looks borrowed.
 */
type IconProps = { className?: string };

const base = 'h-4 w-4 shrink-0';

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? base}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.9" y="1.9" width="5" height="5.6" rx="1.2" />
    <rect x="9.1" y="1.9" width="5" height="3.4" rx="1.2" />
    <rect x="1.9" y="9.7" width="5" height="4.4" rx="1.2" />
    <rect x="9.1" y="7.5" width="5" height="6.6" rx="1.2" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.9 8.6h3.2l1 1.9h3.8l1-1.9h3.2" />
    <path d="M3.3 2.6h9.4l1.4 6v3.4a1.4 1.4 0 0 1-1.4 1.4H3.3a1.4 1.4 0 0 1-1.4-1.4V8.6Z" />
  </Svg>
);

export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.6 3.6h8.5M5.6 8h8.5M5.6 12.4h8.5" />
    <path d="M2.2 3.6h.01M2.2 8h.01M2.2 12.4h.01" />
  </Svg>
);

export const IconProjects = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.9 4.4a1.4 1.4 0 0 1 1.4-1.4h2.5l1.4 1.8h5.5a1.4 1.4 0 0 1 1.4 1.4v5.4a1.4 1.4 0 0 1-1.4 1.4H3.3a1.4 1.4 0 0 1-1.4-1.4Z" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.9 1.4 13.4h13.2Z" />
    <path d="M8 6.2v3.1M8 11.4h.01" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.1" cy="7.1" r="4.6" />
    <path d="m10.5 10.5 3.2 3.2" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 8h10.4M9.2 4l4 4-4 4" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m2.9 8.4 3.2 3.2 7-7.2" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.2v9.6M3.2 8h9.6" />
  </Svg>
);

export const IconSignOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 13.4H3.6a1.4 1.4 0 0 1-1.4-1.4V4a1.4 1.4 0 0 1 1.4-1.4h2.6" />
    <path d="M10.2 11 13.4 8l-3.2-3M13.4 8H6" />
  </Svg>
);

export const IconBlocked = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.8" />
    <path d="m4.2 4.2 7.6 7.6" />
  </Svg>
);

/* ---------------------------------------------------- landing page icons */

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.4 8s2.4-4.3 6.6-4.3S14.6 8 14.6 8s-2.4 4.3-6.6 4.3S1.4 8 1.4 8Z" />
    <circle cx="8" cy="8" r="1.9" />
  </Svg>
);

export const IconPeople = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="5.6" r="2.4" />
    <path d="M1.9 13.4a4.1 4.1 0 0 1 8.2 0" />
    <path d="M10.6 3.6a2.4 2.4 0 0 1 0 4.6M11.4 9.6a4.1 4.1 0 0 1 2.7 3.8" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.1" />
    <path d="M8 4.5V8l2.4 1.6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.1" y="7" width="9.8" height="6.6" rx="1.6" />
    <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.2 3.6h11.6L9.4 8.4v4.4l-2.8-1.6V8.4Z" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.2 13.4h11.6" />
    <path d="M4.4 13.4V9M8 13.4V4.2M11.6 13.4v-5.6" />
  </Svg>
);

export const IconHistory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.4 8a5.6 5.6 0 1 0 1.7-4" />
    <path d="M2.2 2.4v3.2h3.2" />
    <path d="M8 5.2V8l2 1.4" />
  </Svg>
);
