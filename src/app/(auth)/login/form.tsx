'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { login, type FormState } from '@/app/actions/auth';
import { Button, Field, Notice, fieldClass } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Email">
        <input name="email" type="email" autoComplete="email" required className={fieldClass} />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </Field>
      <Submit />
    </form>
  );
}
