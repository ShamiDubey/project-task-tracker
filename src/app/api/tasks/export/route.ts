/**
 * Goal 7.6 — export the currently filtered list as a CSV file.
 *
 * A route handler rather than a server action, because the browser needs a real file download with
 * a Content-Disposition header. It runs the same filter parser and the same query builder as the
 * list page, so the export always matches what the user is looking at.
 */
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { isOverdue } from '@/lib/dates';
import { parseFilters } from '@/lib/queries/filters';
import { CSV_ROW_CAP, listTasksForExport } from '@/lib/queries/tasks';
import { STATUS_LABELS, taskRef } from '@/lib/task-status';

/** Quotes a field only when it needs it, and doubles any embedded quotes. */
function csvCell(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorised', { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const rows = await listTasksForExport(user, parseFilters(params));

  const header = [
    'Reference',
    'Title',
    'Project',
    'Project key',
    'Status',
    'Priority',
    'Due date',
    'Overdue',
    'Assignees',
    'Unfinished blockers',
    'Last updated',
  ];

  const lines = [
    header.join(','),
    ...rows.map((t) =>
      [
        taskRef(t.projectKey, t.number),
        t.title,
        t.projectName,
        t.projectKey,
        STATUS_LABELS[t.status],
        t.priority,
        t.dueDate ?? '',
        isOverdue(t.dueDate, t.status) ? 'yes' : 'no',
        t.assignees.map((a) => a.name).join('; '),
        t.unfinishedBlockerCount,
        t.updatedAt.toISOString(),
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  // A BOM so Excel opens UTF-8 names correctly rather than mangling them.
  const body = `﻿${lines.join('\r\n')}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tasks-${stamp}.csv"`,
      // Tells the caller when the cap truncated the file, rather than silently shortening it.
      'X-Row-Count': String(rows.length),
      'X-Row-Cap': String(CSV_ROW_CAP),
    },
  });
}
