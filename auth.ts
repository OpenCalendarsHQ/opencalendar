/**
 * PulseCalendar NextAuth - OAuth client via iPulse.
 * Required env: IPULSE_CLIENT_ID, IPULSE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL
 */

import { createIPulseNextAuth } from '@ipulsehq/auth-ui'

const { handlers, auth, signIn, signOut } = createIPulseNextAuth({
  appName: 'pulsecalendar',
  scope: 'openid email profile',
})

export { handlers, auth, signIn, signOut }
