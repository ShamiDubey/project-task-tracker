import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { LoginForm } from './form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-2">Welcome back.</p>

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-5 text-sm text-ink-2">
        No account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>

    </>
  );
}
