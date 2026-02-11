import { db } from "@/lib/db";
import { user, calendarAccounts, calendars } from "@/lib/db/schema";
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

  // Auto-create default local calendar for new users
  try {
    // Create local calendar account
    const [localAccount] = await db
      .insert(calendarAccounts)
      .values({
        userId: created.id,
        provider: "local",
        email: "OpenCalendar",
      })
      .returning();

    // Create default "Persoonlijke" calendar
    await db
      .insert(calendars)
      .values({
        accountId: localAccount.id,
        name: "Persoonlijke",
        color: "#3b82f6",
        isVisible: true,
        isPrimary: true,
      });

    console.log(`[Auth] Created default calendar for user ${created.id}`);
  } catch (error) {
    console.error("[Auth] Failed to create default calendar:", error);
    // Don't fail user creation if calendar creation fails
  }

  return created;
}
