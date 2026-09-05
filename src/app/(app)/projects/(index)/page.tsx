import Link from 'next/link';

import { IconPlus } from '@/components/icons';
import { TBody, TD, TH, THead, TR, Table } from '@/components/table';
import { Avatar, EmptyState, LinkButton, PageHeader, Ref, cx } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager } from '@/lib/authz';
import { listProjects } from '@/lib/queries/projects';

export const metadata = { title: 'Projects' };

/**
 * The portfolio as a table.
 *
 * This was a grid of cards, which looked tidy and answered nothing: to compare two projects you had
 * to read two boxes. A table lets the eye run down the overdue column, which is the question anyone
 * opening this page is actually asking. Progress is a bar rather than a percentage because the shape
 * of the remaining work matters more than the number.
 */
export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const user = await requireUser();
  const params = await searchParams;
  const showArchived = params.archived === '1';
  const projects = await listProjects(user, showArchived);

  const totalOpen = projects.reduce((n, p) => n + p.openTasks, 0);
  const totalLate = projects.reduce((n, p) => n + p.overdueTasks, 0);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          projects.length === 0
            ? undefined
            : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} · ${totalOpen} open · ${totalLate} late`
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

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
        {projects.length === 0 ? (
          <EmptyState
            title={showArchived ? 'No archived projects.' : 'No projects yet.'}
            hint={
              isManager(user)
                ? 'Create the first one and add the people who will work on it.'
                : 'You have not been added to any projects. A manager can add you.'
            }
            action={
              isManager(user) && (
                <LinkButton href="/projects/new" tone="primary" size="sm">
                  New project
                </LinkButton>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TH width="88">Key</TH>
              <TH>Project</TH>
              <TH width="150">Owner</TH>
              <TH width="64" align="right">People</TH>
              <TH width="180">Progress</TH>
              <TH width="64" align="right">Open</TH>
              <TH width="72" align="right">Late</TH>
            </THead>
            <TBody>
              {projects.map((project) => {
                const total = Math.max(1, project.openTasks + project.doneTasks);
                const donePct = (project.doneTasks / total) * 100;
                const latePct = (project.overdueTasks / total) * 100;
                return (
                  <TR key={project.id}>
                    <TD>
                      <Ref tone="accent">{project.key}</Ref>
                    </TD>
                    <TD>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {project.name}
                      </Link>
                      {project.archivedAt && (
                        <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-2xs text-ink-3">
                          Archived
                        </span>
                      )}
                      <span className="block max-w-[52ch] truncate text-2xs text-ink-3">
                        {project.description}
                      </span>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5">
                        <Avatar name={project.ownerName} size="xs" />
                        <span className="truncate text-xs text-ink-2">{project.ownerName}</span>
                      </span>
                    </TD>
                    <TD align="right" muted>
                      <span className="text-xs tabular-nums">{project.memberCount}</span>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-2">
                        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                          <span className="h-full bg-danger" style={{ width: `${latePct}%` }} />
                          <span className="h-full bg-good/60" style={{ width: `${donePct}%` }} />
                        </span>
                        <span className="w-8 shrink-0 text-right text-2xs tabular-nums text-ink-3">
                          {Math.round(donePct)}%
                        </span>
                      </span>
                    </TD>
                    <TD align="right">
                      <span className="text-xs font-medium tabular-nums text-ink">{project.openTasks}</span>
                    </TD>
                    <TD align="right">
                      <span
                        className={cx(
                          'text-xs font-medium tabular-nums',
                          project.overdueTasks > 0 ? 'text-danger' : 'text-ink-3',
                        )}
                      >
                        {project.overdueTasks || '—'}
                      </span>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
