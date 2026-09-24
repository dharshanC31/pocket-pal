import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { longToday } from "@/lib/format";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";

const NAV = [
  { to: "/", label: "Dashboard", short: "Today" },
  { to: "/transactions", label: "History", short: "History" },
  { to: "/analysis", label: "Analysis", short: "Analysis" },
  { to: "/categories", label: "Categories", short: "Tags" },
  { to: "/assistant", label: "Assistant", short: "Ask" },
] as const;

export function AppShell({ children, insight }: { children: ReactNode; insight?: string | null }) {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="label-xs">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-accent-soft">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/3 -right-10 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-56 flex-col justify-between border-r border-line bg-white/40 p-6 backdrop-blur-xl md:flex">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">Ledger</span>
              <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
            </div>
            <p className="mt-1 label-xs">A quiet notebook</p>
            <nav className="mt-10 flex flex-col gap-1">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent-soft text-ink"
                        : "text-muted-foreground hover:bg-white/60 hover:text-ink"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${active ? "bg-accent" : "bg-line"}`}
                      style={active ? undefined : { backgroundColor: "var(--line)" }}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="space-y-3">
            {insight ? (
              <div className="rounded-xl border border-line bg-white/50 p-4 backdrop-blur-xl">
                <p className="label-xs text-accent" style={{ color: "var(--accent)" }}>
                  AI insight
                </p>
                <p className="mt-2 text-[13px] leading-snug text-ink">{insight}</p>
              </div>
            ) : null}
            <button
              onClick={() => signOut()}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between px-5 py-4 md:px-12">
            <p className="font-mono text-[11px] text-muted-foreground">{longToday()}</p>
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 md:hidden"
            >
              + Add
            </button>
          </div>
          <div className="px-5 pb-28 md:px-12 md:pb-12">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/70 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center">
          {NAV.slice(0, 2).map((item) => (
            <MobileNavItem key={item.to} to={item.to} label={item.short} active={pathname === item.to} />
          ))}
          <button
            onClick={() => setAdding(true)}
            aria-label="Add transaction"
            className="-mt-4 mx-auto grid size-14 place-items-center rounded-full bg-accent text-primary-foreground shadow-lg"
          >
            <Plus className="size-6" />
          </button>
          {NAV.slice(2, 4).map((item) => (
            <MobileNavItem key={item.to} to={item.to} label={item.short} active={pathname === item.to} />
          ))}
        </div>
      </nav>

      <AddTransactionSheet open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function MobileNavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-3 ${active ? "text-accent" : "text-muted-foreground"}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: active ? "var(--accent)" : "var(--line)" }}
      />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
