import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, FileText, BarChart3, ScrollText, ClipboardList, BookOpen, RefreshCw } from "lucide-react";
import { seedContent } from "@/functions/seedContent";
import HostsTab from "@/components/workspace/HostsTab";
import UsersTab from "@/components/workspace/UsersTab";
import CurriculumTab from "@/components/workspace/CurriculumTab";
import TemplatesTab from "@/components/workspace/TemplatesTab";
import ResourcesTab from "@/components/workspace/ResourcesTab";
import AnalyticsTab from "@/components/workspace/AnalyticsTab";
import AuditTab from "@/components/workspace/AuditTab";

/**
 * Coach Workspace — the single staff surface for the one coach/admin who runs
 * the program. Merges the former Coach Console (Hosts) and Admin Panel
 * (Users, Curriculum, Templates, Analytics, Audit) and adds Resources
 * management. No functionality was dropped in the merge.
 */
export default function CoachWorkspace() {
  const [tab, setTab] = useState("hosts");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-gold flex items-center justify-center"><Shield className="w-6 h-6 text-brand-ink" /></div>
          <div>
            <h1 className="text-2xl font-bold text-brand-text">Coach Workspace</h1>
            <p className="text-brand-mutedtext text-sm">One workspace for coaching and administration: hosts, users, curriculum, templates, resources, analytics, and audit.</p>
          </div>
        </div>
        <SeedButton />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="hosts"><ClipboardList className="w-4 h-4 mr-1" /> Hosts</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="curriculum"><FileText className="w-4 h-4 mr-1" /> Curriculum</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="resources"><BookOpen className="w-4 h-4 mr-1" /> Resources</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="hosts" className="mt-4"><HostsTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="curriculum" className="mt-4"><CurriculumTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="resources" className="mt-4"><ResourcesTab /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SeedButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await seedContent({});
      setResult(res.data || res);
    } catch (e) {
      // Never surface the raw error text to the user.
      console.error("Content seed failed", e);
      setErr("We couldn't re-seed the content right now. Nothing was changed — please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" className="border-brand-gold text-brand-gold hover:bg-brand-gold/10" onClick={run} disabled={busy}>
        <RefreshCw className={`w-4 h-4 mr-1 ${busy ? "animate-spin" : ""}`} /> {busy ? "Seeding…" : "Re-seed content"}
      </Button>
      {result && <span className="text-xs text-brand-mutedtext">Seeded {result.seededDays} days & {result.seededTemplates} templates — now {result.days} days, {result.templates} templates total.</span>}
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}