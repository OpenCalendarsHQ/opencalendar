import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    // Only protect page routes, NOT API routes (they handle auth internally)
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)",
  ],
};
