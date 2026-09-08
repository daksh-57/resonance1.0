import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { api } from "../lib/api";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/sources", label: "Sources" },
  { to: "/datasets", label: "Datasets" },
  { to: "/upload", label: "Upload" },
  { to: "/entities", label: "Entities" },
  { to: "/duplicates", label: "Duplicates" },
  { to: "/conflicts", label: "Conflicts" },
  { to: "/review", label: "Review" },
  { to: "/canonical-records", label: "Canonical" },
  { to: "/audit", label: "Audit" },
  { to: "/analytics", label: "Analytics" },
  { to: "/rules", label: "Rules" },
  { to: "/settings", label: "Settings" },
  { to: "/api", label: "API" },
  { to: "/schedules", label: "Schedules" },
  { to: "/search", label: "Search" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><path d="M3 3v18h18"/><path d="M7 16l4-6 4 4 4-8"/></>,
    sources: <><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></>,
    datasets: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    entities: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    duplicates: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    conflicts: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    review: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    canonical: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    audit: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    analytics: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    rules: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 6.34L2.1 2.1m17.8 17.8l-4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34l-4.24 4.24"/></>,
    api: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    schedules: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = async () => {
    const d = await api.notifications.list();
    setNotifications(d.notifications || []);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen]);

  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = async (id: string) => {
    await api.notifications.read(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter((n) => !n.readAt).map((n) => api.notifications.read(n.id)));
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
  };

  const getNotificationLink = (n: any) => {
    const t = n.type;
    if (t === "import_failed" || t === "import_completed") return "/datasets";
    if (t === "review_required") return "/review";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}>
        <div className="h-14 flex items-center justify-between px-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Link to="/dashboard" className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>ReconcileAI</Link>
        </div>
        <nav className="p-2 space-y-0.5 overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "font-medium" : "font-normal"}`}
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-soft)" : "transparent",
                }}
              >
                <Icon name={item.to.slice(1).split("/")[0] || "dashboard"} size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 lg:ml-64">
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }} onClick={() => setOpen(true)}>
              <Icon name="menu" size={20} />
            </button>
            <h1 className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>{location.pathname.replace("/", "") || "Dashboard"}</h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            </button>
            <div className="relative">
              <button className="p-2 rounded-lg transition-colors relative" style={{ color: "var(--text-secondary)" }} onClick={() => setNotifOpen(!notifOpen)}>
                <Icon name="bell" size={18} />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "var(--color-danger)" }}>{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 surface-elevated rounded-xl z-50 animate-fade-in">
                  <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</div>
                    {unreadCount > 0 && (
                      <button className="text-xs font-medium" style={{ color: "var(--accent)" }} onClick={markAllRead}>Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-xs" style={{ color: "var(--text-tertiary)" }}>No notifications</div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className="p-3 cursor-pointer transition-colors"
                          style={{ borderBottom: "1px solid var(--border-subtle)", color: n.readAt ? "var(--text-tertiary)" : "var(--text-primary)" }}
                          onClick={async () => {
                            if (!n.readAt) await markRead(n.id);
                            window.location.href = getNotificationLink(n);
                          }}
                        >
                          <div className="capitalize font-medium text-xs">{n.type.replace(/_/g, " ")}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{n.title}</div>
                          {n.body && <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{n.body}</div>}
                          <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "var(--accent)" }}>
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--text-secondary)" }}>{user?.name}</span>
            </div>
            <button onClick={logout} className="text-xs font-medium px-2 py-1.5 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}>
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden"><Icon name="logout" size={16} /></span>
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
