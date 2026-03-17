import { auth } from '@/auth';

export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id as string,
    email: session.user.email,
    user_metadata: {
      name: session.user.name || null,
      full_name: session.user.name || null,
      avatar_url: session.user.image || null,
    }
  };
}

export async function getSession() {
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: null,
    user: { id: session.user.id }
  };
}
