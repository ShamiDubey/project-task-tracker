import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { Card } from '@/components/ui';

import { RegisterForm } from './form';

export const metadata = { title: 'Create account · Project Tracker' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <Card className="p-6">
        <RegisterForm />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
