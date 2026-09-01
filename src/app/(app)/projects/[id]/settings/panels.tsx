'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  addProjectMember,
  removeProjectMember,
  setProjectArchived,
  updateProject,
  type ActionState,
} from '@/app/actions/projects';
import { Avatar, Button, Field, Notice, fieldClass } from '@/components/ui';

type Person = { id: string; name: string; email: string; role: string };
type Member = Person & { openTasks: number };

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function EditProjectForm({
  projectId,
  name,
  description,
  ownerId,
  people,
}: {
  projectId: string;
  name: string;
  description: string;
  ownerId: string;
  people: Person[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateProject, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      {state?.error && <Notice>{state.error}</Notice>}
      {state?.ok && <Notice tone="good">{state.ok}</Notice>}

      <Field label="Name">
        <input name="name" defaultValue={name} required className={fieldClass} />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={3} defaultValue={description} className={fieldClass} />
      </Field>
      <Field label="Owner">
        <select name="ownerId" defaultValue={ownerId} className={fieldClass}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.role})
            </option>
          ))}
        </select>
      </Field>
      <Submit label="Save changes" pendingLabel="Saving…" />
    </form>
  );
}

export function MembersPanel({
  projectId,
  ownerId,
  members,
  candidates,
}: {
  projectId: string;
  ownerId: string;
  members: Member[];
  candidates: Person[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(undefined);
  const [toAdd, setToAdd] = useState(candidates[0]?.id ?? '');

  const run = (fn: () => Promise<ActionState>) =>
    startTransition(async () => setMessage(await fn()));

  return (
    <div>
      {message?.error && (
        <div className="px-4 pt-3">
          <Notice>{message.error}</Notice>
        </div>
      )}
      {message?.ok && (
        <div className="px-4 pt-3">
          <Notice tone="good">{message.ok}</Notice>
        </div>
      )}

      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={m.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">
                {m.name}
                {m.id === ownerId && (
                  <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                    Owner
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-ink-muted">{m.email}</p>
            </div>
            <span className="text-xs tabular-nums text-ink-muted">{m.openTasks} open</span>
            <Button
              tone="danger"
              size="sm"
              disabled={pending || m.id === ownerId}
              title={m.id === ownerId ? 'Change the owner before removing them.' : undefined}
              onClick={() => run(() => removeProjectMember(projectId, m.id))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {candidates.length > 0 && (
        <div className="flex items-end gap-2 border-t border-line p-4">
          <div className="flex-1">
            <Field label="Add someone">
              <select
                value={toAdd}
                onChange={(e) => setToAdd(e.target.value)}
                className={fieldClass}
              >
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button
            size="sm"
            disabled={pending || !toAdd}
            onClick={() => run(() => addProjectMember(projectId, toAdd))}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

export function ArchivePanel({ projectId, archived }: { projectId: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(undefined);

  return (
    <div className="space-y-3">
      {message?.error && <Notice>{message.error}</Notice>}
      {message?.ok && <Notice tone="good">{message.ok}</Notice>}
      <Button
        tone={archived ? 'primary' : 'danger'}
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => setMessage(await setProjectArchived(projectId, !archived)))
        }
      >
        {pending ? 'Working…' : archived ? 'Restore project' : 'Archive project'}
      </Button>
    </div>
  );
}
