import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  Card,
  CardHeader,
  Notice,
  OverdueBadge,
  PageHeader,
  Pill,
  PriorityBadge,
  StatusBadge,
} from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { canViewProject, isManager, isProjectMember } from '@/lib/authz';
import { isOverdue, longDateTime, relativeDue, shortDate } from '@/lib/dates';
import { listProjectMembers } from '@/lib/queries/projects';
import {
  candidateBlockers,
  getBlockers,
  getBlocking,
  getTask,
  getTaskAssignees,
  getTimeline,
  transitionContext,
} from '@/lib/queries/task-detail';
import { taskRef } from '@/lib/task-status';

import {
  AssigneeControls,
  CommentForm,
  DeleteTaskButton,
  DependencyControls,
  EditTaskForm,
  StatusControls,
} from './controls';
import { Timeline } from './timeline';

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const user = await requireUser();
  const { id } = await params;

  const task = await getTask(id);
  if (!task) notFound();
  // Goal 1.5 — a member cannot read a task in a project they are not on, even by direct link.
  if (!(await canViewProject(user, task.projectId))) notFound();

  const [ctx, blockers, blocking, assignees, members, timeline, candidates, memberOfProject] =
    await Promise.all([
      transitionContext(id),
      getBlockers(id),
      getBlocking(id),
      getTaskAssignees(id),
      listProjectMembers(task.projectId),
      getTimeline(id),
      candidateBlockers(task.projectId, id),
      isProjectMember(user, task.projectId),
    ]);

  if (!ctx) notFound();

  const canWrite = (isManager(user) || memberOfProject) && !task.projectArchivedAt;
  const overdue = isOverdue(task.dueDate, task.status);
  const existingBlockerIds = new Set(blockers.map((b) => b.id));

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone="accent">{taskRef(task.projectKey, task.number)}</Pill>
            {task.title}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <Link href={`/projects/${task.projectId}`} className="hover:underline">
              {task.projectName}
            </Link>
            <span className="text-ink-subtle">·</span>
            <span>Created {shortDate(task.createdAt)}</span>
            <span className="text-ink-subtle">·</span>
            <span>Updated {longDateTime(task.updatedAt)}</span>
          </span>
        }
        actions={
          <>
            {canWrite && (
              <EditTaskForm
                taskId={id}
                title={task.title}
                description={task.description}
                priority={task.priority}
                dueDate={task.dueDate}
              />
            )}
            {isManager(user) && <DeleteTaskButton taskId={id} />}
          </>
        }
      />

      {task.projectArchivedAt && (
        <div className="mb-4">
          <Notice tone="info">
            This task belongs to an archived project, so it is read-only. Its data and history are
            intact — restoring the project makes it editable again.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <div className="px-4 py-3">
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm text-ink">{task.description}</p>
              ) : (
                <p className="text-sm text-ink-muted">No description.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Timeline"
              subtitle="Created, every field change with both values, every assignment, and comments. Permanent — nothing here can be edited or deleted, by anyone."
            />
            <Timeline entries={timeline} />
            {canWrite && <CommentForm taskId={id} />}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status" />
            <div className="px-4 py-3">
              <StatusControls taskId={id} ctx={ctx} canWrite={canWrite} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-line text-sm">
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-ink-muted">Priority</dt>
                <dd>
                  <PriorityBadge priority={task.priority} />
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-ink-muted">Due</dt>
                <dd className="flex items-center gap-2">
                  {overdue && <OverdueBadge />}
                  <span className={overdue ? 'text-danger' : 'text-ink'}>
                    {task.dueDate ? `${shortDate(task.dueDate)} · ${relativeDue(task.dueDate)}` : 'No due date'}
                  </span>
                </dd>
              </div>
              {task.completedAt && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-ink-muted">Completed</dt>
                  <dd className="text-good">{shortDate(task.completedAt)}</dd>
                </div>
              )}
              {task.blockedFromStatus && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-ink-muted">Blocked from</dt>
                  <dd>
                    <StatusBadge status={task.blockedFromStatus} />
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Assignees" subtitle="Only members of this project can be assigned." />
            <AssigneeControls
              taskId={id}
              assignees={assignees}
              members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
              canWrite={canWrite}
            />
          </Card>

          <Card>
            <CardHeader title="Blocked by" subtitle="This task cannot be finished until these are." />
            <DependencyControls
              taskId={id}
              blockers={blockers.map((b) => ({
                id: b.id,
                ref: taskRef(b.projectKey, b.number),
                title: b.title,
                status: b.status,
              }))}
              candidates={candidates
                .filter((c) => !existingBlockerIds.has(c.id))
                .map((c) => ({ id: c.id, ref: taskRef(task.projectKey, c.number), title: c.title }))}
              canWrite={canWrite}
            />
          </Card>

          {blocking.length > 0 && (
            <Card>
              <CardHeader title="Blocking" subtitle="These cannot finish until this one does." />
              <ul className="divide-y divide-line">
                {blocking.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 px-4 py-2.5">
                    <Pill>{taskRef(b.projectKey, b.number)}</Pill>
                    <Link
                      href={`/tasks/${b.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-ink hover:underline"
                    >
                      {b.title}
                    </Link>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
