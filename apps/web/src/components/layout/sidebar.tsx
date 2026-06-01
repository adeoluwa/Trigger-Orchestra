"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  KeyRound,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2, exact: false },
  { href: "/dashboard/deployments", label: "Deployments", icon: Rocket, exact: false },
  { href: "/dashboard/secrets", label: "Secrets", icon: KeyRound, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Zap className="size-5 text-sidebar-primary" />
        <span className="font-semibold text-sm tracking-tight">Trigger Orchestra</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium truncate">{user?.username ?? "—"}</span>
          <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={logout} title="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
