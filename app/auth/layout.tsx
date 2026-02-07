export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-6 text-center">
          <h1 className="font-pixel text-lg font-bold tracking-wider text-foreground">OpenCalendar</h1>
          <p className="mt-1 text-xs text-muted-foreground">Jouw agenda, jouw manier.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          {children}
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Door verder te gaan, ga je akkoord met onze voorwaarden.
        </p>
      </div>
    </div>
  );
}
