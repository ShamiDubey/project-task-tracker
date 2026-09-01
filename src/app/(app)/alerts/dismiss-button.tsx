'use client';

import { useState, useTransition } from 'react';

import { dismissAlert } from '@/app/actions/tasks';
import { Button } from '@/components/ui';

export function DismissButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <div>
      <Button
        tone="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await dismissAlert(taskId);
            setError(result?.error);
          })
        }
      >
        {pending ? 'Dismissing…' : 'Dismiss'}
      </Button>
      {error && <p className="mt-1 max-w-40 text-xs text-danger">{error}</p>}
    </div>
  );
}
