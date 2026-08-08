import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useHostProfile } from "@/lib/useHostProfile";
import { TERMS_VERSION } from "@/lib/legal";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";

export default function Home() {
  const { user } = useAuth();
  const role = user?.role || "host";
  const { profile, loading } = useHostProfile();

  if (role === "admin") return <Navigate to="/workspace" replace />;
  if (role === "coach") return <Navigate to="/workspace" replace />;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <Onboarding />;
  // A version bump re-prompts rather than silently carrying an old acceptance.
  if (profile.terms_version !== TERMS_VERSION) return <Onboarding existingProfile={profile} />;
  return <Dashboard />;
}