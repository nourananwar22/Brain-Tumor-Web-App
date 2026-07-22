import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  FileText,
  Activity,
  Brain,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Analysis", url: "/upload", icon: UploadCloud },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
];

function useLogoutHandler() {
  const navigate = useNavigate();
  return () => {
    logout();
    navigate({ to: "/login", replace: true });
  };
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const handleLogout = useLogoutHandler();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-elegant">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold text-sidebar-foreground">NeuroScan</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            MRI Analysis
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {items.map((item) => {
          const active =
            item.url === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          System Operational
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          AI model v3.2 · 99.8% uptime
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3 w-3" />
          <span>~1.2s avg inference</span>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
            {(user?.displayName ?? "D").split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.displayName ?? "Doctor"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.role === "head" ? "Head of Department" : `@${user?.username ?? "doctor"}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export function MobileTopbar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const handleLogout = useLogoutHandler();
  return (
    <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex items-center gap-2 px-4 h-14">
        <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
          <Brain className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold">NeuroScan</span>
        <button
          onClick={handleLogout}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          aria-label="Log out"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
      <nav className="flex overflow-x-auto gap-1 px-3 pb-2">
        {items.map((item) => {
          const active =
            item.url === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
