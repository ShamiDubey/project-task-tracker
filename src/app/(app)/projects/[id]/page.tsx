import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TaskList } from '@/components/task-table';
import {
  Avatar,
  Card,
  CardHeader,
  LinkButton,
  Notice,
  PageHeader,
  Ref,
} from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { canViewProject, isManager } from '@/lib/authz';
import { getProject, listProjectMembers } from '@/lib/queries/projects';
import { listTasks } from '@/lib/queries/tasks';

import { NewTaskForm } from './new-task-form';

export default async function ProjectPage({ params }: PageProps<'/projects/[id]'>) {
  const user = await requireUser();
  const { id } = await params;

  // Goal 1.5 — a member who guesses a project id gets the same 404 as one that does not exist.
  if (!(await canViewProject(user, id))) notFound();
  const project = await getProject(user, id);
  if (!project) notFound();

  const [{ rows: tasks, total }, members] = await Promise.all([
    listTasks(user, { projectId: id, includeArchived: true, sort: 'priority', dir: 'desc', pageSize: 100 }),
    listProjectMembers(id),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Ref tone="accent">{project.key}</Ref>
            {project.name}
            {project.archivedAt && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-normal text-ink-2">
                Archived
              </span>
            )}
          </span>
        }
        subtitle={project.description}
        actions={
          isManager(user) && (
            <LinkButton href={`/projects/${id}/settings`} tone="secondary" size="sm">
              Project settings
            </LinkButton>
          )
        }
      />

      {project.archivedAt && (
        <div className="mb-4">
          <Notice tone="info">
            This project is archived, so it is hidden from the default views. Its tasks and their
            history are untouched — a manager can restore it from project settings.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Tasks"
              subtitle={`${total} task${total === 1 ? '' : 's'} in this project`}
              action={
                <Link
                  href={`/tasks?project=${id}`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Open in list view
                </Link>
              }
            />
            <TaskList
              tasks={tasks}
              showProject={false}
              emptyTitle="No tasks in this project yet."
              emptyHint="Add the first one below."
            />
          </Card>

          {!project.archivedAt && (
            <Card className="mt-4 p-4">
              <NewTaskForm projectId={id} />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Owner" />
            <div className="flex items-center gap-2 px-4 py-3">
              <Avatar name={project.ownerName} />
              <span className="text-sm text-ink">{project.ownerName}</span>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Members"
              subtitle={`${members.length} on this project`}
              action={
                isManager(user) && (
                  <Link
                    href={`/projects/${id}/settings`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Manage
                  </Link>
                )
              }
            />
            <ul className="divide-y divide-line">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-4 py-2.5">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{m.name}</p>
                    <p className="truncate text-xs text-ink-2">{m.email}</p>
                  </div>
                  <span className="text-xs tabular-nums text-ink-2">{m.openTasks} open</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
