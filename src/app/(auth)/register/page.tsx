import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { RegisterForm } from './form';

export const metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-ink-2">Join the portfolio as a member.</p>

      <div className="mt-6">
        <RegisterForm />
      </div>

      <p className="mt-5 text-sm text-ink-2">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
