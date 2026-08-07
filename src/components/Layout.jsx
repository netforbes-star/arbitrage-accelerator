import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { STAFF_ROLES } from "@/lib/roles";
import { base44 } from "@/api/base44Client";
import { Menu, X, Stethoscope, LayoutDashboard, CalendarDays, Calculator, MapPin, Users, FileText, ClipboardList, Shield, LogOut, Download } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["host", ...STAFF_ROLES] },
  { to: "/program", label: "Program", icon: CalendarDays, roles: ["host", ...STAFF_ROLES] },
  { to: "/deals", label: "Deal Analyzer", icon: Calculator, roles: ["host", ...STAFF_ROLES] },
  { to: "/markets", label: "Markets", icon: MapPin, roles: ["host", ...STAFF_ROLES] },
  { to: "/landlords", label: "Landlords", icon: Users, roles: ["host", ...STAFF_ROLES] },
  { to: "/export", label: "Download", icon: Download, roles: ["host", ...STAFF_ROLES] },
  { to: "/templates", label: "Templates", icon: FileText, roles: ["host", ...STAFF_ROLES] },
  { to: "/coach", label: "Coach Console", icon: ClipboardList, roles: STAFF_ROLES },
  { to: "/admin", label: "Admin", icon: Shield, roles: STAFF_ROLES }
];

export default function Layout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const role = user?.role || "host";
  const items = NAV.filter((i) => i.roles.includes(role));

  const handleLogout = () => { base44.auth.logout(); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext hover:bg-brand-raised hover:text-brand-text"
    }`;

  const Brand = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-brand-gold flex items-center justify-center">
        <Stethoscope className="w-5 h-5 text-brand-ink" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-brand-text text-sm">Arbitrage Accelerator</div>
        <div className="text-[10px] uppercase tracking-wider text-brand-gold font-medium">Nurse Net AED</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-ink">
      <header className="lg:hidden sticky top-0 z-40 bg-brand-surface border-b border-brand-line px-4 h-14 flex items-center justify-between">
        <Brand />
        <button onClick={() => setOpen(true)} className="p-2 -mr-2 text-brand-mutedtext"><Menu className="w-6 h-6" /></button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-brand-surface h-full flex flex-col p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Brand />
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-brand-mutedtext"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 space-y-1">
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === "/"} onClick={() => setOpen(false)} className={linkClass}>
                  <i.icon className="w-4 h-4" />{i.label}
                </NavLink>
              ))}
            </nav>
            <SidebarFooter email={user?.email} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-brand-surface border-r border-brand-line flex-col p-4">
        <div className="mb-8 px-2 pt-2"><Brand /></div>
        <nav className="flex-1 space-y-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkClass}>
              <i.icon className="w-4 h-4" />{i.label}
            </NavLink>
          ))}
        </nav>
        <SidebarFooter email={user?.email} onLogout={handleLogout} />
      </aside>

      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarFooter({ email, onLogout }) {
  return (
    <div className="border-t border-brand-line pt-3 mt-3 space-y-2">
      <div className="px-3 text-xs text-brand-mutedtext">{email}</div>
      <Link to="/terms" target="_blank" rel="noreferrer" className="block px-3 text-xs text-brand-gold hover:underline">Terms &amp; Privacy</Link>
      <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-mutedtext hover:bg-brand-raised hover:text-brand-text w-full">
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
}