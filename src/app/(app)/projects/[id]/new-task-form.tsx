'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { createTask, type ActionState } from '@/app/actions/tasks';
import { Button, Field, Notice, fieldClass } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Adding…' : 'Add task'}
    </Button>
  );
}

export function NewTaskForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createTask, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-sm font-semibold text-ink">Add a task</p>
      {state?.error && <Notice>{state.error}</Notice>}

      <Field label="Title">
        <input name="title" required placeholder="What needs doing?" className={fieldClass} />
      </Field>

      <Field label="Description">
        <textarea name="description" rows={2} className={fieldClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Priority">
          <select name="priority" defaultValue="medium" className={fieldClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Due date" hint="Optional.">
          <input name="dueDate" type="date" className={fieldClass} />
        </Field>
      </div>

      <Submit />
    </form>
  );
}
