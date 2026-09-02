import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { LoginForm } from './form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-2">Welcome back.</p>

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-5 text-sm text-ink-2">
        No account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-3.5 shadow-e1">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden />
          Demo accounts
        </p>
        <dl className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">Manager</dt>
            <dd className="font-mono text-ink">priya@tracker.dev</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">Member</dt>
            <dd className="font-mono text-ink">sam@tracker.dev</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5">
            <dt className="text-ink-2">Password, either</dt>
            <dd className="font-mono text-ink">password123</dd>
          </div>
        </dl>
        <p className="mt-2.5 text-2xs leading-relaxed text-ink-3">
          Sign in as both — the difference is the point. A member only sees the projects they are on.
        </p>
      </div>
    </>
  );
}
