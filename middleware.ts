import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // Auth is enforced client-side in DashboardLayout via useAuth().
  // A cookie-name check here is unreliable: Supabase embeds the project ref
  // in the cookie name (sb-<ref>-auth-token), which varies per project.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
