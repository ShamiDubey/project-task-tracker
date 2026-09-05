import Link from 'next/link';

import {
  IconArrowRight,
  IconChart,
  IconCheck,
  IconClock,
  IconEye,
  IconFilter,
  IconHistory,
  IconList,
  IconLock,
  IconPeople,
} from '@/components/icons';
import { ProductPreview } from '@/components/product-preview';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = {
  title: 'Cadence — clarity for every project',
  description:
    'Cadence brings projects, tasks, people and deadlines together in one place, so nothing slips and every client gets the delivery you promised.',
};

/**
 * The public landing page.
 *
 * A note on the copy, because it is a deliberate choice. The obvious version of this page carries
 * the usual proof — a customer count, a star rating, a named testimonial. There is no honest source
 * for any of that here, and inventing a delivery director at a company that does not exist is the
 * kind of detail that undermines everything around it if anyone looks. So the structure is the
 * familiar one and the content is limited to things that are true: what the product does, what it is
 * built on, and what you can go and look at yourself.
 */
export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-full bg-canvas">
      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-5">
          <Link href="/" className="flex items-center gap-2">
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight text-ink">Cadence</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
            <a href="#what" className="transition-colors hover:text-ink">What it does</a>
            <a href="#capabilities" className="transition-colors hover:text-ink">Capabilities</a>
            <a href="#built" className="transition-colors hover:text-ink">How it is built</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
              >
                Open the app <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink">
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
                >
                  Open the demo <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)] lg:py-24">
          <div className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden />
              Built for services teams that deliver
            </span>

            <h1 className="mt-6 text-[clamp(1.85rem,3.2vw,2.45rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-ink">
              Clarity for every project.
              <br />
              Confidence in every delivery.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-2">
              Cadence brings projects, tasks, people and deadlines into one place — so nothing slips,
              and anyone can answer <em className="not-italic text-ink">what is overdue</em> and{' '}
              <em className="not-italic text-ink">who is overloaded</em> without asking around.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={user ? '/dashboard' : '/login'}
                className="sheen inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas shadow-e1 transition-colors hover:bg-ink/90"
              >
                {user ? 'Open the app' : 'Open the demo'}
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#what"
                className="inline-flex items-center rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
              >
                See what it does
              </a>
            </div>

            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-2">
              {['Manager and member accounts', 'Seeded portfolio', 'No sign-up'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 text-good" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* The real interface, bled off the right edge so it reads as a window into the product. */}
          <div
            className="reveal relative hidden lg:block"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            {/* The whole application, scaled down and bled off the right edge so it reads as a
                window onto the product rather than a picture pasted into a box. */}
            <div className="pointer-events-none absolute left-0 top-1/2 w-[1000px] -translate-y-1/2 origin-left scale-[0.62] xl:scale-[0.7]">
              <div className="overflow-hidden rounded-xl border border-line shadow-e3">
                <ProductPreview />
              </div>
            </div>
            <div className="h-[440px]" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ trust strip */}
      <section id="what" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <p className="text-center text-sm text-ink-2">
            One tool replacing spreadsheets, chat threads, and due dates that only live in people’s heads.
          </p>
          <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <IconEye />, title: 'See the whole picture', body: 'Every project in one list, ordered by how much is already late.' },
              { icon: <IconPeople />, title: 'Balance the team', body: 'Open work per person, with the overdue portion called out.' },
              { icon: <IconClock />, title: 'Catch slippage early', body: 'Overdue work surfaces itself, with a count in the navigation.' },
              { icon: <IconLock />, title: 'A record you can trust', body: 'Every change is kept, with who made it and what it was before.' },
            ].map((f, i) => (
              <div key={f.title} className={i > 0 ? 'lg:border-l lg:border-line lg:pl-8' : ''}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-2">
                  {f.icon}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- capabilities */}
      <section id="capabilities" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="text-center">
            <h2 className="text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.028em] text-ink">
              Everything your team needs to deliver.
            </h2>
            <p className="mt-2.5 text-sm text-ink-2">
              Built around the rules real projects have, not the ones that are easy to code.
            </p>
          </div>

          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: <IconList />, title: 'Projects & Tasks', body: 'Organise work in projects. Break it into tasks with priorities, owners and blocking dependencies.' },
              { icon: <IconPeople />, title: 'Smart Assignment', body: 'Only people on a project can be assigned its work. Remove someone and their assignments go with them.' },
              { icon: <IconFilter />, title: 'Powerful Filters', body: 'Search titles and descriptions. Filter by project, status, assignee, priority and overdue — on the server.' },
              { icon: <IconChart />, title: 'Insights & Reports', body: 'Open, overdue, due this week, completed. Split by status and by person, with eight weeks of throughput.' },
              { icon: <IconHistory />, title: 'History & Transparency', body: 'Every change tracked with its old and new value. Full history, permanent, including for managers.' },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-line bg-surface p-5 transition-shadow duration-200 hover:shadow-e2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-canvas text-ink-2">
                  {f.icon}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- dark band */}
      <section id="built" className="bg-[#0e0e12]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <h2 className="max-w-md text-[clamp(1.6rem,3vw,2.1rem)] font-semibold leading-tight tracking-[-0.028em] text-white">
                Built so the rules cannot be broken.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
                The parts that matter are held by the database rather than by hopeful application
                code. A task cannot be blocked by work in another project. Someone who is not on a
                project cannot be assigned to its tasks. A finished task cannot be marked done while
                something it depends on is unfinished.
              </p>

              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                {[
                  { n: '158', l: 'automated checks, across four suites' },
                  { n: '17', l: 'illegal writes the database refuses' },
                  { n: '0', l: 'ways to edit the audit trail' },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="text-[26px] font-semibold leading-none tabular-nums text-white">{s.n}</dt>
                    <dd className="mt-2 text-xs leading-relaxed text-white/45">{s.l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs font-medium uppercase tracking-[0.11em] text-white/40">
                The two questions
              </p>
              <p className="mt-5 text-lg leading-relaxed text-white/85">
                “A manager finds out a deadline was missed when the client brings it up, not before.
                Nobody can say what is overdue across the whole portfolio, or which of their people is
                quietly buried while another has nothing this week.”
              </p>
              <p className="mt-5 text-sm leading-relaxed text-white/45">
                That is the problem this was built for. Both questions are answered on the first screen
                after signing in — not buried in a report someone has to go and run.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- final CTA */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-line bg-canvas px-7 py-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-ink">Have a look around.</h2>
              <p className="mt-1 text-sm text-ink-2">
                The demo is seeded with a full portfolio — overdue work, blocked chains, an uneven
                workload and eight weeks of history.
              </p>
            </div>
            <Link
              href={user ? '/dashboard' : '/login'}
              className="sheen inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
            >
              {user ? 'Open the app' : 'Open the demo'}
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- footer */}
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div>
              <div className="flex items-center gap-2">
                <Mark />
                <span className="text-sm font-semibold tracking-tight text-ink">Cadence</span>
              </div>
              <p className="mt-3 max-w-[16rem] text-xs leading-relaxed text-ink-2">
                Clarity for every project.
                <br />
                Confidence in every delivery.
              </p>
            </div>

            {[
              { heading: 'Product', links: [['What it does', '#what'], ['Capabilities', '#capabilities'], ['How it is built', '#built'], ['Open the demo', '/login']] },
              { heading: 'The build', links: [['Architecture', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/architecture.md'], ['Schema', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/schema.md'], ['Decisions', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/decisions.md'], ['Plan', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/plan.md']] },
              { heading: 'Repository', links: [['Source', 'https://github.com/ShamiDubey/project-task-tracker'], ['The brief', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/brief.md'], ['Submission', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/SUBMISSION.md'], ['AI prompts', 'https://github.com/ShamiDubey/project-task-tracker/blob/main/docs/ai-prompts.md']] },
            ].map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold text-ink">{col.heading}</h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-xs text-ink-2 transition-colors hover:text-ink"
                        {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <p className="text-xs text-ink-3">
              An internal delivery tool, built as a take-home submission.
            </p>
            <a
              href="https://github.com/ShamiDubey/project-task-tracker"
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-xs text-ink-3 transition-colors hover:text-ink"
            >
              github.com/ShamiDubey/project-task-tracker
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent">
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
        <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
        <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
        <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
      </svg>
    </span>
  );
}
