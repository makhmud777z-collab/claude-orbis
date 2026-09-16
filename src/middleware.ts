import { NextResponse, type NextRequest } from "next/server";
import { slugFromHost } from "@/lib/tenants";

/**
 * Мультиарендность: арендатор определяется по Host до рендера.
 * Порядок: собственный домен агентства → поддомен → cookie (демо-переключатель).
 * Результат кладётся в заголовок запроса, серверные компоненты читают его в layout.
 */
export function middleware(request: NextRequest) {
  const fromHost = slugFromHost(request.headers.get("host"));
  const fromCookie = request.cookies.get("orbis_tenant")?.value ?? null;
  const slug = fromHost ?? fromCookie ?? "";

  const headers = new Headers(request.headers);
  headers.set("x-orbis-tenant", slug);
  headers.set("x-orbis-host", request.headers.get("host") ?? "");

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
