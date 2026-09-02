import Link from 'next/link';

import { Card, CardHeader, EmptyState, PageHeader, Ref, PriorityBadge, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { relativeDue, shortDate } from '@/lib/dates';
import { listOpenAlerts } from '@/lib/queries/alerts';
import { taskRef } from '@/lib/task-status';

import { DismissButton } from './dismiss-button';

export const metadata = { title: 'Overdue alerts · Project Tracker' };

/**
 * Goal 10 — tasks past their due date and not finished.
 *
 * Dismissals are per person and are recorded against the due date they were dismissed at, so a task
 * whose due date later moves reappears here on its own. Nothing on this page has to know that; the
 * query simply stops matching the dismissal.
 */
export default async function AlertsPage() {
  const user = await requireUser();
  const alerts = await listOpenAlerts(user);

  return (
    <>
      <PageHeader
        title="Overdue alerts"
        subtitle="Tasks that are past their due date and not finished. Dismissing one hides it for you only — and it comes back if the due date changes."
      />

      <Card>
        <CardHeader
          title={`${alerts.length} open alert${alerts.length === 1 ? '' : 's'}`}
          subtitle={
            user.role === 'manager' ? 'Across the whole portfolio.' : 'Across the projects you are on.'
          }
        />
        {alerts.length === 0 ? (
          <EmptyState
            title="Nothing is overdue."
            hint="Either everything is on time, or you have dismissed the alerts you can."
          />
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((alert) => (
              <li key={alert.taskId} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Ref tone="accent">{taskRef(alert.projectKey, alert.number)}</Ref>
                    <Link
                      href={`/tasks/${alert.taskId}`}
                      className="truncate text-sm font-medium text-ink hover:underline"
                    >
                      {alert.title}
                    </Link>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge status={alert.status} />
                    <PriorityBadge priority={alert.priority} />
                    <Link
                      href={`/projects/${alert.projectId}`}
                      className="text-xs text-ink-2 hover:underline"
                    >
                      {alert.projectName}
                    </Link>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-danger">{relativeDue(alert.dueDate)}</p>
                  <p className="text-xs text-ink-2">Due {shortDate(alert.dueDate)}</p>
                  <div className="mt-1.5">
                    {alert.isAssignedToViewer ? (
                      <DismissButton taskId={alert.taskId} />
                    ) : (
                      <span
                        className="text-xs text-ink-3"
                        title="Only someone assigned to a task can dismiss its alert."
                      >
                        Not yours to dismiss
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
