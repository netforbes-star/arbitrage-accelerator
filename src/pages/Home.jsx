import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useHostProfile } from "@/lib/useHostProfile";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";

export default function Home() {
  const { user } = useAuth();
  const role = user?.role || "host";
  const { profile, loading } = useHostProfile();

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "coach") return <Navigate to="/coach" replace />;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <Onboarding />;
  return <Dashboard />;
}