import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isStaff } from "@/lib/roles";
import { base44 } from "@/api/base44Client";
import { Menu, X, Stethoscope, LayoutDashboard, CalendarDays, Calculator, MapPin, Users, FileText, Shield, LogOut, Download, BookOpen } from "lucide-react";

// Primary host workflow, in journey order.
const PRIMARY = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/markets", label: "Market Analyzer", icon: MapPin },
  { to: "/deals", label: "Deal Analyzer", icon: Calculator },
  { to: "/landlords", label: "Landlord Pipeline", icon: Users },
  { to: "/program", label: "Program", icon: CalendarDays }
];

// Supporting tools — available, but visually demoted so they don't compete.
const SECONDARY = [
  { to: "/resources", label: "Resources", icon: BookOpen },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/export", label: "Download", icon: Download }
];

// Staff-only workspace, separated at the bottom.
const STAFF = [
  { to: "/workspace", label: "Coach Workspace", icon: Shield }
];

export default function Layout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const staff = isStaff(user?.role);

  const handleLogout = () => { base44.auth.logout(); };

  const primaryClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext hover:bg-brand-raised hover:text-brand-text"
    }`;

  const secondaryClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      isActive ? "text-brand-gold" : "text-brand-mutedtext/80 hover:text-brand-text"
    }`;

  const staffClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext hover:bg-brand-raised hover:text-brand-text"
    }`;

  const NavGroups = ({ onNavigate }) => (
    <>
      <nav className="space-y-1">
        {PRIMARY.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} onClick={onNavigate} className={primaryClass}>
            <i.icon className="w-4 h-4" />{i.label}
          </NavLink>
        ))}
      </nav>
      <div className="my-3 border-t border-brand-line" />
      <nav className="space-y-0.5">
        {SECONDARY.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} onClick={onNavigate} className={secondaryClass}>
            <i.icon className="w-3.5 h-3.5" />{i.label}
          </NavLink>
        ))}
      </nav>
      {staff && (
        <>
          <div className="my-3 border-t border-brand-line" />
          <nav className="space-y-1">
            {STAFF.map((i) => (
              <NavLink key={i.to} to={i.to} onClick={onNavigate} className={staffClass}>
                <i.icon className="w-4 h-4" />{i.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </>
  );

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
            <div className="flex-1 overflow-y-auto">
              <NavGroups onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter email={user?.email} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-brand-surface border-r border-brand-line flex-col p-4">
        <div className="mb-8 px-2 pt-2"><Brand /></div>
        <div className="flex-1 overflow-y-auto">
          <NavGroups />
        </div>
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