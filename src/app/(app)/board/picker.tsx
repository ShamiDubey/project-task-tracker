'use client';

import { useRouter } from 'next/navigation';

import { fieldBase } from '@/components/ui';

export function ProjectPicker({
  projects,
  selected,
}: {
  projects: { id: string; key: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Project"
      value={selected}
      onChange={(e) => router.push(`/board?project=${e.target.value}`)}
      className={`${fieldBase} w-auto py-2 text-sm`}
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.key} · {p.name}
        </option>
      ))}
    </select>
  );
}
