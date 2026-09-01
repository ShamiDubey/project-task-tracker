import { notFound, redirect } from 'next/navigation';

import { Card, CardHeader, PageHeader, Pill } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isManager } from '@/lib/authz';
import { getProject, listAllUsers, listProjectMembers } from '@/lib/queries/projects';

import { ArchivePanel, EditProjectForm, MembersPanel } from './panels';

export default async function ProjectSettingsPage({
  params,
}: PageProps<'/projects/[id]/settings'>) {
  const user = await requireUser();
  const { id } = await params;

  // Every mutation on this page re-checks the role on the server too. This redirect is only so a
  // member does not see a page full of controls that would all refuse them.
  if (!isManager(user)) redirect(`/projects/${id}`);

  const project = await getProject(user, id);
  if (!project) notFound();

  const [members, everyone] = await Promise.all([listProjectMembers(id), listAllUsers()]);
  const memberIds = new Set(members.map((m) => m.id));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Pill tone="accent">{project.key}</Pill>
            Project settings
          </span>
        }
        subtitle={project.name}
      />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Details" subtitle="The key cannot change — it is baked into task references." />
          <div className="p-4">
            <EditProjectForm
              projectId={id}
              name={project.name}
              description={project.description}
              ownerId={project.ownerId}
              people={everyone}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Members"
            subtitle="Removing someone also unassigns them from this project's tasks, and records each unassignment in the task's timeline."
          />
          <MembersPanel
            projectId={id}
            ownerId={project.ownerId}
            members={members}
            candidates={everyone.filter((p) => !memberIds.has(p.id))}
          />
        </Card>

        <Card>
          <CardHeader
            title={project.archivedAt ? 'Restore' : 'Archive'}
            subtitle="Archiving hides a project from the default views. Nothing is deleted — the tasks and their whole history stay exactly as they are."
          />
          <div className="p-4">
            <ArchivePanel projectId={id} archived={Boolean(project.archivedAt)} />
          </div>
        </Card>
      </div>
    </div>
  );
}
