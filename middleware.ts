import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — redirect logged-in users to their dashboard
  if (pathname === "/login" || pathname === "/") {
    const session = await getSessionFromRequest(req);
    if (session) {
      if (session.role === "agency") return NextResponse.redirect(new URL("/agency", req.url));
      if (session.role === "admin")  return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.redirect(new URL("/client", req.url));
    }
    return NextResponse.next();
  }

  // Protected agency routes
  if (pathname.startsWith("/agency")) {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (session.role !== "agency") {
      if (session.role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.redirect(new URL("/client", req.url));
    }
    return NextResponse.next();
  }

  // Protected admin routes
  if (pathname.startsWith("/admin")) {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (session.role !== "admin") {
      if (session.role === "agency") return NextResponse.redirect(new URL("/agency", req.url));
      return NextResponse.redirect(new URL("/client", req.url));
    }
    return NextResponse.next();
  }

  // Protected client routes
  if (pathname.startsWith("/client")) {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (session.role !== "client") {
      if (session.role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.redirect(new URL("/agency", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/agency/:path*", "/admin/:path*", "/client/:path*"],
};
