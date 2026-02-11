import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensure the authenticated user exists in our local `user` table.
 * Supabase Auth manages sessions externally, but our calendar tables
 * reference `user.id` via foreign keys. This bridges the gap.
 */
export async function ensureUserExists(sessionUser: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionUser.id));

  if (existing) {
    // Update user info if it has changed (e.g., avatar_url, name)
    const needsUpdate =
      existing.image !== sessionUser.image ||
      existing.name !== (sessionUser.name || "Gebruiker") ||
      existing.email !== (sessionUser.email || null);

    if (needsUpdate) {
      const [updated] = await db
        .update(user)
        .set({
          name: sessionUser.name || "Gebruiker",
          email: sessionUser.email || null,
          image: sessionUser.image || null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, sessionUser.id))
        .returning();

      return updated;
    }

    return existing;
  }

  const [created] = await db
    .insert(user)
    .values({
      id: sessionUser.id,
      name: sessionUser.name || "Gebruiker",
      email: sessionUser.email || null,
      emailVerified: false,
      image: sessionUser.image || null,
    })
    .returning();

  return created;
}
