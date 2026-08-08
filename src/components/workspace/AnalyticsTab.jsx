import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Stat, Spinner } from "./WorkspaceShared";

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoadError(false);
    try {
      const [users, profiles, deals, landlords, progress] = await Promise.all([
        base44.entities.User.list("-created_date", 200),
        base44.entities.OnboardingProfile.list("-created_date", 200),
        base44.entities.Deal.list("-created_date", 200),
        base44.entities.Landlord.list("-created_date", 200),
        base44.entities.UserTaskProgress.list("-created_date", 200)
      ]);
      setData({ users, profiles, deals, landlords, progress });
    } catch (e) {
      console.error("Analytics load failed", e);
      setLoadError(true);
    }
  };
  useEffect(() => { load(); }, []);

  if (!data && !loadError) return <Spinner />;
  if (loadError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load analytics right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
    </div>
  );

  const hosts = data.users.filter((u) => u.role === "host");
  const signed = data.deals.filter((d) => d.status === "lease signed").length;
  const avgProgress = data.progress.length ? Math.round((data.progress.filter((p) => p.status === "complete").length / data.progress.length) * 100) : 0;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Hosts" value={hosts.length} />
      <Stat label="Deals underwritten" value={data.deals.length} />
      <Stat label="Leases signed" value={signed} />
      <Stat label="Landlords in pipeline" value={data.landlords.length} />
      <Stat label="Avg task completion" value={`${avgProgress}%`} />
      <Stat label="Coaches" value={data.users.filter((u) => u.role === "coach").length} />
      <Stat label="Markets active" value={new Set(data.profiles.map((p) => p.target_market_city)).size} />
      <Stat label="Total outreach touches" value={data.landlords.filter((l) => l.stage !== "not contacted").length} />
    </div>
  );
}