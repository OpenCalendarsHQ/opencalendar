import { useSession as useNextAuthSession } from 'next-auth/react';

export function useSession() {
  const { data: session, status } = useNextAuthSession();

  return {
    data: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      user_metadata: {
        name: session.user.name || null,
        full_name: session.user.name || null,
        avatar_url: session.user.image || null,
      }
    } : null,
    isPending: status === 'loading',
  };
}

export function useSupabase() {
  console.warn("useSupabase is deprecated, use API routes instead");
  return null;
}
