import { Card, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="animate-rise">
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-7 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
            <Skeleton className="mt-3 h-2.5 w-24" />
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-line px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/**
 * Deliberately inside the (index) route group rather than at `projects/`.
 *
 * A `loading.tsx` wraps its segment *and everything nested under it* in a Suspense boundary. Placed
 * one level up it would also wrap /tasks/[id] — and once Next begins streaming
 * the shell, the HTTP status is already committed to 200, so a later notFound() or redirect() can
 * only be resolved on the client. The pages still refuse correctly, but they refuse with a 200.
 *
 * Route groups do not appear in the URL, so this keeps the skeleton on the list page and leaves the
 * authorisation-gated routes able to answer 404 and 307 properly.
 */
