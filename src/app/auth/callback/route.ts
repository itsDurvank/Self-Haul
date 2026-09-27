import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  // Sanitize origin: convert 0.0.0.0 to localhost so Windows browsers can connect
  let targetOrigin = url.origin.replace('0.0.0.0', 'localhost');
  const host = request.headers.get('host');
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    const cleanHost = host.replace('0.0.0.0', 'localhost');
    targetOrigin = `${protocol}://${cleanHost}`;
  }

  const redirectUrl = `${targetOrigin}${next}`;

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error('Supabase exchangeCodeForSession error:', error);
  }

  return NextResponse.redirect(`${targetOrigin}/`);
}
