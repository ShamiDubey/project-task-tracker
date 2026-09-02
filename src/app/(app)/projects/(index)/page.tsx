import Link from 'next/link';

import { IconPlus } from '@/components/icons';
import { Tilt } from '@/components/motion';
import { Avatar, Card, EmptyState, LinkButton, PageHeader, Ref, cx } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager } from '@/lib/authz';
import { listProjects } from '@/lib/queries/projects';

export const metadata = { title: 'Projects' };

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const user = await requireUser();
  const params = await searchParams;
  const showArchived = params.archived === '1';
  const projects = await listProjects(user, showArchived);

  return (
    <>
      <PageHeader
        eyebrow={isManager(user) ? 'Portfolio' : 'Your work'}
        title="Projects"
        subtitle={
          isManager(user)
            ? 'Every engagement in the portfolio, with its open and overdue count.'
            : 'The projects you have been added to.'
        }
        actions={
          <>
            <LinkButton href={showArchived ? '/projects' : '/projects?archived=1'} tone="secondary" size="sm">
              {showArchived ? 'Hide archived' : 'Show archived'}
            </LinkButton>
            {isManager(user) && (
              <LinkButton href="/projects/new" tone="primary" size="sm">
                <IconPlus className="h-3.5 w-3.5" />
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
                ? 'Create the first one and add the people who will work on it.'
                : 'You have not been added to any projects yet. A manager can add you.'
            }
            action={
              isManager(user) && (
                <LinkButton href="/projects/new" tone="primary" size="sm">
                  New project
                </LinkButton>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const health = project.overdueTasks > 0 ? 'late' : project.openTasks > 0 ? 'active' : 'clear';
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block h-full">
                <Tilt max={5} className="h-full">
                  <Card
                    className={cx(
                      'edge-glow relative flex h-full flex-col p-4 group-hover:shadow-e2',
                      project.archivedAt && 'opacity-70',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Ref tone="accent">{project.key}</Ref>
                      <span
                        className={cx(
                          'ml-auto inline-flex items-center gap-1.5 text-2xs font-medium',
                          health === 'late' ? 'text-danger' : health === 'active' ? 'text-info' : 'text-good',
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {health === 'late'
                          ? `${project.overdueTasks} late`
                          : health === 'active'
                            ? 'On track'
                            : 'All clear'}
                      </span>
                    </div>

                    <h2 className="mt-2.5 text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                      {project.name}
                      {project.archivedAt && (
                        <span className="ml-2 rounded-full bg-surface-2 px-1.5 py-0.5 text-2xs font-normal text-ink-3">
                          Archived
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-2">
                      {project.description}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                      <dl className="flex gap-5">
                        <div>
                          <dt className="text-2xs text-ink-3">Open</dt>
                          <dd data-metric className="text-sm font-medium text-ink">
                            {project.openTasks}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs text-ink-3">Overdue</dt>
                          <dd
                            data-metric
                            className={cx(
                              'text-sm font-medium',
                              project.overdueTasks > 0 ? 'text-danger' : 'text-ink',
                            )}
                          >
                            {project.overdueTasks}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs text-ink-3">People</dt>
                          <dd data-metric className="text-sm font-medium text-ink">
                            {project.memberCount}
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-1.5" title={`Owner: ${project.ownerName}`}>
                        <Avatar name={project.ownerName} size="xs" />
                        <span className="max-w-[92px] truncate text-2xs text-ink-3">
                          {project.ownerName}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Tilt>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
