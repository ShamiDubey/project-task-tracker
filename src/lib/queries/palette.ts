import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { projects, tasks, type User } from '@/db/schema';
import { taskRef } from '@/lib/task-status';

import { visibleProjects } from './visibility';

/**
 * The command palette's index — everything the viewer can reach, and nothing they cannot.
 *
 * Capped, because this is sent with the shell on every page load. Beyond the cap the palette would
 * become a debounced server search; at this data size, shipping the labels once and matching in the
 * browser is both faster to use and less code.
 */
const CAP = 300;

export async function paletteIndex(user: User) {
  const [projectRows, taskRows] = await Promise.all([
    db
      .select({ id: projects.id, key: projects.key, name: projects.name })
      .from(projects)
      .where(visibleProjects(user))
      .limit(50),
    db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        status: tasks.status,
        projectKey: projects.key,
        projectName: projects.name,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(visibleProjects(user), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.updatedAt))
      .limit(CAP),
  ]);

  return [
    ...projectRows.map((p) => ({
      id: `pr-${p.id}`,
      kind: 'project' as const,
      label: p.name,
      ref: p.key,
      href: `/projects/${p.id}`,
    })),
    ...taskRows.map((t) => ({
      id: `tk-${t.id}`,
      kind: 'task' as const,
      label: t.title,
      sublabel: t.projectName,
      ref: taskRef(t.projectKey, t.number),
      status: t.status,
      href: `/tasks/${t.id}`,
    })),
  ];
}
