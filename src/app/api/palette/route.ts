/**
 * The command palette's index, fetched on first use rather than shipped with every page.
 *
 * It used to be built in the application shell, which meant two extra queries — one of them
 * returning up to 300 rows — on every single navigation, to populate a feature most page views never
 * touch. Moving it here trades a one-off ~300ms wait the first time ⌘K is pressed for two fewer
 * round trips on every page load.
 */
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { paletteIndex } from '@/lib/queries/palette';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorised', { status: 401 });

  // Scoped to the viewer by paletteIndex, so this can be cached privately in the browser for the
  // length of a working session without leaking anything between accounts.
  return NextResponse.json(await paletteIndex(user), {
    headers: { 'Cache-Control': 'private, max-age=60' },
  });
}
