import 'server-only';

import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import {
  activity,
  projects,
  taskAssignees,
  taskDependencies,
  tasks,
  users,
  type TaskStatus,
} from '@/db/schema';
import type { BlockerRef } from '@/lib/task-status';
import { taskRef } from '@/lib/task-status';

export async function getTask(taskId: string) {
  const [row] = await db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      blockedFromStatus: tasks.blockedFromStatus,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectId: projects.id,
      projectKey: projects.key,
      projectName: projects.name,
      projectArchivedAt: projects.archivedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** The blockers of a task, with enough detail to name them in a rejection message. */
export async function getBlockers(taskId: string) {
  const blocker = alias(tasks, 'blocker');
  const rows = await db
    .select({
      id: blocker.id,
      number: blocker.number,
      title: blocker.title,
      status: blocker.status,
      projectKey: projects.key,
    })
    .from(taskDependencies)
    .innerJoin(blocker, eq(blocker.id, taskDependencies.blockingTaskId))
    .innerJoin(projects, eq(projects.id, blocker.projectId))
    .where(eq(taskDependencies.taskId, taskId))
    .orderBy(asc(blocker.number));
  return rows;
}

/** The tasks this one is blocking — the reverse direction, shown on the detail page. */
export async function getBlocking(taskId: string) {
  const blocked = alias(tasks, 'blocked');
  return db
    .select({
      id: blocked.id,
      number: blocked.number,
      title: blocked.title,
      status: blocked.status,
      projectKey: projects.key,
    })
    .from(taskDependencies)
    .innerJoin(blocked, eq(blocked.id, taskDependencies.taskId))
    .innerJoin(projects, eq(projects.id, blocked.projectId))
    .where(eq(taskDependencies.blockingTaskId, taskId))
    .orderBy(asc(blocked.number));
}

/** The context `validateTransition` needs, loaded from the database. */
export async function transitionContext(taskId: string): Promise<{
  status: TaskStatus;
  blockedFromStatus: TaskStatus | null;
  unfinishedBlockers: BlockerRef[];
} | null> {
  const task = await getTask(taskId);
  if (!task) return null;
  const blockers = await getBlockers(taskId);
  return {
    status: task.status,
    blockedFromStatus: task.blockedFromStatus,
    unfinishedBlockers: blockers
      .filter((b) => b.status !== 'done')
      .map((b) => ({ ref: taskRef(b.projectKey, b.number), title: b.title, status: b.status })),
  };
}

export async function getTaskAssignees(taskId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(eq(taskAssignees.taskId, taskId))
    .orderBy(asc(users.name));
}

/** Goal 9 — the whole timeline, oldest first, comments included in the same stream. */
export async function getTimeline(taskId: string) {
  const subject = alias(users, 'subject');
  return db
    .select({
      id: activity.id,
      type: activity.type,
      field: activity.field,
      oldValue: activity.oldValue,
      newValue: activity.newValue,
      body: activity.body,
      createdAt: activity.createdAt,
      actorName: users.name,
      subjectName: subject.name,
    })
    .from(activity)
    .leftJoin(users, eq(users.id, activity.actorId))
    .leftJoin(subject, eq(subject.id, activity.subjectUserId))
    .where(eq(activity.taskId, taskId))
    .orderBy(asc(activity.createdAt));
}

/** Candidate blockers: other tasks in the same project (Goal 3.4). */
export async function candidateBlockers(projectId: string, taskId: string) {
  return db
    .select({ id: tasks.id, number: tasks.number, title: tasks.title, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), ne(tasks.id, taskId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.number));
}
