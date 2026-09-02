'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { register, type FormState } from '@/app/actions/auth';
import { Button, Field, Notice, fieldClass } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Full name">
        <input name="name" required autoComplete="name" className={fieldClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </Field>
      <p className="text-xs text-ink-2">
        New accounts are members. Managers are granted by an existing manager, never chosen here.
      </p>
      <Submit />
    </form>
  );
}
