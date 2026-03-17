'use client';

import { IPulseRedirectSignIn } from '@ipulsehq/auth-ui';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  return <IPulseRedirectSignIn callbackUrl={callbackUrl} />;
}
