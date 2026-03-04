import { useUser } from "@clerk/nextjs";

export function useSession() {
  const { user, isLoaded } = useUser();

  return {
    data: user ? {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      user_metadata: {
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
        full_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
        avatar_url: user.imageUrl || null,
      }
    } : null,
    isPending: !isLoaded,
  };
}

export function useSupabase() {
  // Return a mock or handle it elsewhere if needed. 
  // Most Supabase calls should be replaced with API calls now.
  console.warn("useSupabase is deprecated, use Clerk or API routes instead");
  return null;
}
