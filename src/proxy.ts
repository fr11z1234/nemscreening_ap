import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Opdaterer Supabase-sessionen pa hver navigation og sender ikke-loggede
 * brugere til login. (Hed "middleware" for Next.js 16.)
 *
 * Bemaerk: her tjekkes kun OM brugeren er logget ind. auth.users er faelles med
 * websitets kundeportal, sa en website-kunde slipper igennem dette lag.
 * Selve adgangen til screening-data afgores af medlemskab i screening.app_users
 * — handhaevet af RLS i databasen og tjekket i app-layoutet for at give en
 * ordentlig fejlbesked frem for tomme sider.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "screening" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginRoute = path === "/login";

  // API-ruter skal svare med JSON. En redirect til login-siden ville lande som
  // en HTML-side i en fetch() og give en uforstaelig parse-fejl i klienten.
  if (!user && path.startsWith("/api/")) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sager";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
