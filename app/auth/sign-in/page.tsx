import { signIn } from '@/auth'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  await signIn('ipulse', { redirectTo: callbackUrl || '/dashboard' })
}
