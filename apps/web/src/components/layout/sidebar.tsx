"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  KeyRound,
  GitFork,
  LogOut,
  Workflow,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMounted } from "@/hooks/use-mounted";

const navItems = [
  { href: "/dashboard",                  label: "Overview",      icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/projects",         label: "Projects",      icon: FolderGit2,      exact: false },
  { href: "/dashboard/repositories",     label: "Repositories",  icon: GitFork,         exact: false },
  { href: "/dashboard/deployments",      label: "Deployments",   icon: Rocket,          exact: false },
  { href: "/dashboard/secrets",          label: "Secrets",       icon: KeyRound,        exact: false },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
      {initials}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const mounted = useMounted();

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Workflow className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none tracking-tight">Trigger</span>
          <span className="text-[10px] text-sidebar-foreground/40 leading-none mt-0.5">Orchestra</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        <p className="px-2 mb-1 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-primary/15 text-primary font-medium shadow-[inset_0_0_0_1px_oklch(0.65_0.18_142/0.25)]"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="size-3 text-primary/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
          {mounted ? (
            <>
              <UserAvatar name={user?.name ?? user?.email ?? "U"} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-none">{user?.name ?? "—"}</p>
                <p className="text-[11px] text-sidebar-foreground/40 truncate mt-0.5 leading-none">{user?.email}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2.5">
              <span className="size-7 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
                <div className="h-2 w-28 rounded bg-muted animate-pulse" />
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign out"
            className="shrink-0 rounded p-1 text-sidebar-foreground/30 hover:text-destructive transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
