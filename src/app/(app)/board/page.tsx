import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager, isProjectMember } from '@/lib/authz';
import { listProjectOptions } from '@/lib/queries/projects';
import { listTasks } from '@/lib/queries/tasks';

import { Board } from './board';
import { ProjectPicker } from './picker';

export const metadata = { title: 'Board' };

/**
 * A per-project board. Scoped to one project because status is a project-level workflow and a board
 * spanning the whole portfolio would be a wall of columns. The picker chooses which; the drag
 * behaviour and its rules live in the client component.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const projects = await listProjectOptions(user);

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Board" subtitle="Drag a task between columns to move it through its lifecycle." />
        <p className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-ink-2">
          You are not on any projects yet.
        </p>
      </>
    );
  }

  const selectedId = projects.find((p) => p.id === params.project)?.id ?? projects[0].id;
  const selected = projects.find((p) => p.id === selectedId)!;

  const { rows } = await listTasks(user, { projectId: selectedId, pageSize: 200 });
  const canWrite = isManager(user) || (await isProjectMember(user, selectedId));

  return (
    <>
      <PageHeader
        title="Board"
        subtitle="Drag a task between columns to move it. The lifecycle rules still apply — an illegal move is refused with a reason."
        actions={<ProjectPicker projects={projects} selected={selectedId} />}
      />
      <Board key={selected.id} tasks={rows} canWrite={canWrite} />
    </>
  );
}
