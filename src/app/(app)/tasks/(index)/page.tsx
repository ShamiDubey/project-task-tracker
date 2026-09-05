import { Pagination } from '@/components/pagination';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { parseFilters } from '@/lib/queries/filters';
import { listAssigneeOptions, listProjectOptions } from '@/lib/queries/projects';
import { listTasks } from '@/lib/queries/tasks';

import { BulkTaskList } from './bulk-list';
import { TaskFilters } from './filters';

export const metadata = { title: 'All tasks · Project Tracker' };

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const [page, projects, assignees] = await Promise.all([
    listTasks(user, filters),
    listProjectOptions(user, filters.includeArchived),
    listAssigneeOptions(user),
  ]);

  return (
    <>
      <PageHeader
        title="All tasks"
        subtitle={
          user.role === 'manager'
            ? 'Every task across the portfolio. Searching, filtering, sorting and paging all happen on the server.'
            : 'Every task in the projects you are on.'
        }
      />

      {/* One frame around the whole working surface — filters, table and pagination read as a single
          instrument rather than three cards stacked on a page. */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
        <div className="px-3 pt-3">
          <TaskFilters
            projects={projects.map((p) => ({ id: p.id, name: p.name, key: p.key }))}
            assignees={assignees.map((a) => ({ id: a.id, name: a.name }))}
            total={page.total}
          />
        </div>

        <BulkTaskList tasks={page.rows} people={assignees.map((a) => ({ id: a.id, name: a.name }))} />

        <div className="border-t border-line px-3">
          <Pagination
            params={params}
            page={page.page}
            pageCount={page.pageCount}
            total={page.total}
            pageSize={page.pageSize}
            basePath="/tasks"
          />
        </div>
      </div>
    </>
  );
}
