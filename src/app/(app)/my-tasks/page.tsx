import { Pagination } from '@/components/pagination';
import { TaskList } from '@/components/task-table';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { parseFilters } from '@/lib/queries/filters';
import { listMyTasks } from '@/lib/queries/tasks';

export const metadata = { title: 'My tasks · Project Tracker' };

/** Goal 5.4 — one list of everything assigned to me, across every project. */
export default async function MyTasksPage({ searchParams }: PageProps<'/my-tasks'>) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const openOnly = params.all !== '1';

  const page = await listMyTasks(user, {
    ...filters,
    statuses: openOnly ? ['backlog', 'in_progress', 'in_review', 'blocked'] : filters.statuses,
    sort: filters.sort === 'updated_at' ? 'due_date' : filters.sort,
    dir: filters.sort === 'updated_at' ? 'asc' : filters.dir,
  });

  return (
    <>
      <PageHeader
        title="My tasks"
        subtitle="Everything assigned to you, across every project, soonest due first."
        actions={
          <LinkButton href={openOnly ? '/my-tasks?all=1' : '/my-tasks'} tone="secondary" size="sm">
            {openOnly ? 'Include finished' : 'Open work only'}
          </LinkButton>
        }
      />

      <Card>
        <TaskList
          tasks={page.rows}
          emptyTitle="Nothing assigned to you."
          emptyHint="When someone assigns you a task it will appear here."
        />
      </Card>

      <Pagination
        params={params}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        basePath="/my-tasks"
      />
    </>
  );
}
