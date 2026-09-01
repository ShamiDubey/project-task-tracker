'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { createProject, type ActionState } from '@/app/actions/projects';
import { Button, Field, LinkButton, Notice, fieldClass } from '@/components/ui';

type Person = { id: string; name: string; role: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create project'}
    </Button>
  );
}

export function NewProjectForm({
  people,
  defaultOwnerId,
}: {
  people: Person[];
  defaultOwnerId: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createProject, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice>{state.error}</Notice>}

      <Field label="Key" hint="Short, uppercase, used in task references like ACME-14. Cannot be changed later.">
        <input
          name="key"
          required
          maxLength={10}
          placeholder="ACME"
          className={`${fieldClass} font-mono uppercase`}
        />
      </Field>

      <Field label="Name">
        <input name="name" required placeholder="Acme Retail Replatform" className={fieldClass} />
      </Field>

      <Field label="Description" hint="What the engagement is, and anything that matters about it.">
        <textarea name="description" rows={4} className={fieldClass} />
      </Field>

      <Field label="Owner" hint="The owner is automatically a member of the project.">
        <select name="ownerId" defaultValue={defaultOwnerId} className={fieldClass}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.role})
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center gap-2 pt-2">
        <Submit />
        <LinkButton href="/projects" tone="ghost">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
