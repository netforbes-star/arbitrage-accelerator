import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Loads the current host's onboarding profile (used for coach_id stamping,
// start date, target market). Coaches/admins pass a hostId to load a specific
// host's profile instead.
export function useHostProfile(hostId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.OnboardingProfile.list("-created_date", 50);
        if (!active) return;
        const found = hostId
          ? list.find((p) => p.created_by_id === hostId)
          : list[0];
        setProfile(found || null);
      } catch (e) {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hostId]);

  return { profile, loading, coachId: profile?.coach_id || "" };
}