import Link from 'next/link';

import { Card, EmptyState, LinkButton, PageHeader, Pill } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager } from '@/lib/authz';
import { listProjects } from '@/lib/queries/projects';

export const metadata = { title: 'Projects · Project Tracker' };

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const user = await requireUser();
  const params = await searchParams;
  const showArchived = params.archived === '1';
  const projects = await listProjects(user, showArchived);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          isManager(user)
            ? 'Every project in the portfolio.'
            : 'The projects you are a member of.'
        }
        actions={
          <>
            <LinkButton
              href={showArchived ? '/projects' : '/projects?archived=1'}
              tone="secondary"
              size="sm"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </LinkButton>
            {isManager(user) && (
              <LinkButton href="/projects/new" tone="primary" size="sm">
                New project
              </LinkButton>
            )}
          </>
        }
      />

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects to show."
            hint={
              isManager(user)
                ? 'Create the first one to get started.'
                : 'You have not been added to any projects yet.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-2">
                  <Pill tone="accent">{project.key}</Pill>
                  {project.archivedAt && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-muted">
                      Archived
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-sm font-semibold text-ink">{project.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{project.description}</p>
                <dl className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
                  <div>
                    <dt className="text-ink-subtle">Open</dt>
                    <dd className="font-medium tabular-nums text-ink">{project.openTasks}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">Overdue</dt>
                    <dd
                      className={
                        'font-medium tabular-nums ' +
                        (project.overdueTasks > 0 ? 'text-danger' : 'text-ink')
                      }
                    >
                      {project.overdueTasks}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">People</dt>
                    <dd className="font-medium tabular-nums text-ink">{project.memberCount}</dd>
                  </div>
                  <div className="ml-auto text-right">
                    <dt className="text-ink-subtle">Owner</dt>
                    <dd className="font-medium text-ink">{project.ownerName}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
