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
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
                >
                  Create an account <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] lg:pb-20 lg:pt-16">
          <div className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2">
              <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
              Built for services teams that deliver
            </span>

            {/* The largest thing on the page by a distance. At this size the two lines carry the
                whole argument, so everything below can be quiet. */}
            <h1 className="mt-7 text-[clamp(2rem,3.6vw,2.85rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-ink">
              Clarity for every project.
              <br />
              Confidence in every delivery.
            </h1>

            <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.65] text-ink-2">
              Cadence brings your projects, tasks, people and deadlines together in one place — so
              nothing slips, and anyone can answer{' '}
              <span className="text-ink">what is overdue</span> and{' '}
              <span className="text-ink">who is overloaded</span> without asking around.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={user ? '/dashboard' : '/login'}
                className="sheen inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-[15px] font-medium text-canvas shadow-e2 transition-colors hover:bg-ink/90"
              >
                {user ? 'Open the app' : 'Sign in'}
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2"
              >
                Create an account
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
              {['Manager and member accounts', 'Seeded portfolio', 'Roles enforced on the server'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4 text-good" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="reveal relative hidden lg:block"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            {/* The whole application, scaled down and bled off the right edge so it reads as a
                window onto the product rather than a picture pasted into a box. */}
            <div className="pointer-events-none absolute left-0 top-1/2 w-[1000px] -translate-y-1/2 origin-left scale-[0.58] xl:scale-[0.66]">
              <div className="overflow-hidden rounded-xl border border-line shadow-e3">
                <ProductPreview />
              </div>
            </div>
            <div className="h-[470px]" />
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
        <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
            {/* --------------------------------------------------------- copy */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                How it is built
              </p>
              <h2 className="mt-4 max-w-[15ch] text-[clamp(1.7rem,2.6vw,2.2rem)] font-semibold leading-[1.14] tracking-[-0.028em] text-white">
                The rules are held by the database.
              </h2>
              <p className="mt-5 max-w-[36ch] text-[15px] leading-[1.65] text-white/50">
                Not by application code that has to remember them. Every writer — a form, a bulk
                action, a seed script — meets the same refusal, so an invariant cannot quietly rot
                the day somebody adds a new one.
              </p>

              <dl className="mt-9 grid grid-cols-3 gap-6 border-t border-white/10 pt-7">
                {[
                  { n: '160', l: 'automated\nchecks' },
                  { n: '17', l: 'illegal writes\nrefused' },
                  { n: '0', l: 'ways to edit\nthe history' },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="text-[30px] font-semibold leading-none tabular-nums text-white">
                      {s.n}
                    </dt>
                    <dd className="mt-2.5 whitespace-pre-line text-xs leading-[1.5] text-white/40">
                      {s.l}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ------------------------------------------------ what it refuses
                Real constraint names from the schema, and the real reason each one exists. It shows
                the engineering rather than describing it, and every line is checkable against
                drizzle/0000_init.sql. */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                </span>
                <p className="ml-1 text-xs font-medium text-white/55">
                  Writes Postgres will not accept
                </p>
              </div>

              <ul className="divide-y divide-white/[0.07]">
                {[
                  ['A task blocked by work in another project', 'task_dependencies_blocking_fk'],
                  ['Assigning somebody who is not on the project', 'task_assignees_membership_fk'],
                  ['Blocked, with no record of where it came from', 'tasks_blocked_state_consistent'],
                  ['Finished, with no completion time', 'tasks_completed_at_consistent'],
                  ['A task blocking itself', 'task_dependencies_no_self_block'],
                ].map(([rule, constraint]) => (
                  <li key={constraint} className="flex items-start gap-3 px-5 py-3">
                    <span
                      aria-hidden
                      className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c0362c]/15 text-[10px] font-bold text-[#f28b82]"
                    >
                      ✕
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-snug text-white/85">{rule}</span>
                      <span className="mt-1 block font-mono text-[11px] text-white/30">
                        {constraint}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="border-t border-white/10 px-5 py-3.5 text-xs leading-relaxed text-white/40">
                Each one was verified by attempting the write and confirming the database refused it.
                A constraint nobody has watched fire is not a constraint.
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
                Seeded with a full portfolio — overdue work, blocked chains, an uneven workload and
                eight weeks of history.
              </p>
            </div>
            <Link
              href={user ? '/dashboard' : '/login'}
              className="sheen inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
            >
              {user ? 'Open the app' : 'Sign in'}
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
              { heading: 'Product', links: [['What it does', '#what'], ['Capabilities', '#capabilities'], ['How it is built', '#built'], ['Sign in', '/login']] },
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
