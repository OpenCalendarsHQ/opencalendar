import { currentUser, auth } from "@clerk/nextjs/server";

export async function getUser() {
  const user = await currentUser();
  if (!user) return null;

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;

  // Return compatible user object — full_name is a legacy Supabase alias for name
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    user_metadata: {
      name,
      full_name: name,
      avatar_url: user.imageUrl || null,
    }
  };
}

export async function getSession() {
  const { sessionId, userId } = await auth();
  if (!userId) return null;

  return {
    id: sessionId,
    user: { id: userId }
  };
}
