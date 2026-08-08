import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isStaff } from "@/lib/roles";
import ResourceList from "@/components/resources/ResourceList";
import ResourceManager from "@/components/resources/ResourceManager";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function Resources() {
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await base44.entities.Resource.list("sort_order", 200);
      setResources(r);
    } catch (e) {
      console.error("Resources load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-gold flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-brand-ink" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Resources</h1>
          <p className="text-brand-mutedtext text-sm">Curated outside reading that supports the program — not a replacement for it.</p>
        </div>
      </div>
      <p className="text-xs text-brand-mutedtext">These are third-party resources Nurse Net AED does not control.</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="space-y-4 py-10 text-center">
          <p className="text-brand-mutedtext">We couldn't load resources right now.</p>
          <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
        </div>
      ) : (
        <>
          <ResourceList resources={resources} />
          {staff && (
            <div className="pt-6 border-t border-brand-line">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-gold mb-3">Manage resources</h2>
              <ResourceManager onChanged={load} />
            </div>
          )}
        </>
      )}
    </div>
  );
}