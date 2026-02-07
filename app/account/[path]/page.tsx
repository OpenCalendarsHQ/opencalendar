import { AccountView } from "@neondatabase/auth/react";

export const dynamicParams = false;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <AccountView path={path} />
    </main>
  );
}
