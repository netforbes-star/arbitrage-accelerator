import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ShieldAlert } from "lucide-react";

/**
 * Defense-in-depth role gate.
 *
 * Row-level security on the entities is the real enforcement boundary — this
 * component exists so a host who types /admin or /coach straight into the URL
 * bar never reaches a screen built for someone else, even though RLS would
 * already return them an empty result set. Hiding the nav link is not a
 * control; this is.
 */
export default function RoleRoute({ allow = [] }) {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role || "host";

  if (!allow.includes(role)) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="w-14 h-14 rounded-full bg-brand-raised flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-brand-mutedtext" />
        </div>
        <h1 className="text-xl font-semibold text-brand-text mb-2">This area isn't yours</h1>
        <p className="text-brand-mutedtext text-sm">
          You're signed in as a {role}. This screen is for {allow.join(" and ")} accounts only.
          If you think that's wrong, reach out to your coach.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
