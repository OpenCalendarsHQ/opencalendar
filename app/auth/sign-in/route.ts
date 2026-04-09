import { signIn } from '@/auth'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
  await signIn('ipulse', { redirectTo: callbackUrl })
}
