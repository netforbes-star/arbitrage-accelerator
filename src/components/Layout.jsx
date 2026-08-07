import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Menu, X, Stethoscope, LayoutDashboard, CalendarDays, Calculator, Users, FileText, ClipboardList, Shield, LogOut } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["host", "admin"] },
  { to: "/program", label: "Program", icon: CalendarDays, roles: ["host", "admin"] },
  { to: "/deals", label: "Deal Analyzer", icon: Calculator, roles: ["host", "admin"] },
  { to: "/landlords", label: "Landlords", icon: Users, roles: ["host", "admin"] },
  { to: "/templates", label: "Templates", icon: FileText, roles: ["host", "coach", "admin"] },
  { to: "/coach", label: "Coach Console", icon: ClipboardList, roles: ["coach", "admin"] },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["admin"] }
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user?.role || "host";
  const items = NAV.filter((i) => i.roles.includes(role));

  const handleLogout = () => {
    base44.auth.logout();
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  const Brand = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
        <Stethoscope className="w-5 h-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-brand text-sm">Arbitrage Accelerator</div>
        <div className="text-[10px] uppercase tracking-wider text-brand-gold font-medium">Nurse Net AED</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Brand />
        <button onClick={() => setOpen(true)} className="p-2 -mr-2 text-slate-600">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white h-full flex flex-col p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Brand />
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === "/"} onClick={() => setOpen(false)} className={linkClass}>
                  <i.icon className="w-4 h-4" />
                  {i.label}
                </NavLink>
              ))}
            </nav>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex-col p-4">
        <div className="mb-8 px-2 pt-2">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkClass}>
              <i.icon className="w-4 h-4" />
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="px-3 pb-2 text-xs text-slate-400">{user?.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 w-full">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}