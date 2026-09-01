import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { Card } from '@/components/ui';

import { LoginForm } from './form';

export const metadata = { title: 'Sign in · Project Tracker' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <Card className="p-6">
        <LoginForm />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        No account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
      <div className="mt-6 rounded-lg border border-line bg-surface p-3 text-xs text-ink-muted">
        <p className="mb-1.5 font-medium text-ink">Demo accounts</p>
        <p>
          Manager — <span className="font-mono">priya@tracker.dev</span>
        </p>
        <p>
          Member — <span className="font-mono">sam@tracker.dev</span>
        </p>
        <p className="mt-1.5">
          Password for both — <span className="font-mono">password123</span>
        </p>
      </div>
    </>
  );
}
