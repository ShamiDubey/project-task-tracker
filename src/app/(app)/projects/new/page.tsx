import { redirect } from 'next/navigation';

import { Card, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager } from '@/lib/authz';
import { listAllUsers } from '@/lib/queries/projects';

import { NewProjectForm } from './form';

export const metadata = { title: 'New project · Project Tracker' };

export default async function NewProjectPage() {
  const user = await requireUser();
  // Goal 1.3/1.6 — the guard is here on the server, not only on the button that links here.
  if (!isManager(user)) redirect('/projects');

  const people = await listAllUsers();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New project" subtitle="Managers can create and archive projects." />
      <Card className="p-6">
        <NewProjectForm people={people} defaultOwnerId={user.id} />
      </Card>
    </div>
  );
}
