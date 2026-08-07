import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Users, FileText, BarChart3, ScrollText, Save } from "lucide-react";

export default function AdminPanel() {
  const [tab, setTab] = useState("users");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center"><Shield className="w-6 h-6 text-white" /></div>
        <div>
          <h1 className="text-2xl font-bold text-brand">Admin Panel</h1>
          <p className="text-slate-500 text-sm">Manage users, roles, cohorts, curriculum, and view analytics & audit log.</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="curriculum"><FileText className="w-4 h-4 mr-1" /> Curriculum</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="curriculum" className="mt-4"><CurriculumTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});

  const load = async () => {
    const [u, p] = await Promise.all([
      base44.entities.User.list("-created_date", 200),
      base44.entities.OnboardingProfile.list("-created_date", 200)
    ]);
    setUsers(u);
    setProfiles(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const profileFor = (uid) => profiles.find((p) => p.created_by_id === uid);
  const setField = (uid, field, val) => setEdits((e) => ({ ...e, [uid]: { ...e[uid], [field]: val } }));

  const saveUser = async (u) => {
    const patch = edits[u.id] || {};
    const oldRole = u.role;
    const newRole = patch.role || oldRole;
    const cohort = patch.cohort !== undefined ? patch.cohort : u.cohort;
    await base44.entities.User.update(u.id, { role: newRole, cohort });
    if (patch.coachAssign) {
      const prof = profileFor(u.id);
      if (prof) await base44.entities.OnboardingProfile.update(prof.id, { coach_id: patch.coachAssign });
    }
    if (newRole !== oldRole) logAudit("role_change", `Changed ${u.email} role from ${oldRole} to ${newRole}`, u.email);
    setEdits((e) => ({ ...e, [u.id]: {} }));
    load();
  };

  if (loading) return <Spinner />;

  const coaches = users.filter((u) => u.role === "coach");

  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-brand text-lg">Users ({users.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-400">Note: passwords and authentication credentials are never shown or editable here.</p>
        {users.map((u) => {
          const prof = profileFor(u.id);
          const e = edits[u.id] || {};
          return (
            <div key={u.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-slate-800">{u.email}</div>
                  <div className="text-xs text-slate-400">{u.full_name || "—"}{u.cohort ? ` · Cohort ${u.cohort}` : ""}</div>
                </div>
                <Badge className={u.role === "admin" ? "bg-brand text-white" : u.role === "coach" ? "bg-brand-bright text-white" : "bg-slate-200 text-slate-700"}>{u.role}</Badge>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={e.role || u.role} onValueChange={(v) => setField(u.id, "role", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="host">host</SelectItem><SelectItem value="coach">coach</SelectItem><SelectItem value="admin">admin</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cohort</Label>
                  <Input className="h-8 text-xs" value={e.cohort !== undefined ? e.cohort : (u.cohort || "")} onChange={(ev) => setField(u.id, "cohort", ev.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Assign coach</Label>
                  <Select value={e.coachAssign || prof?.coach_id || ""} onValueChange={(v) => setField(u.id, "coachAssign", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent><SelectItem value={null}>— None —</SelectItem>{coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" className="bg-brand mt-2" onClick={() => saveUser(u)}><Save className="w-3 h-3 mr-1" /> Save</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CurriculumTab() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = async () => {
    const d = await base44.entities.ProgramDay.list("day", 50);
    setDays(d.sort((a, b) => a.day - b.day));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    await base44.entities.ProgramDay.update(edit.id, { title: edit.title, why_it_matters: edit.why_it_matters });
    setEdit(null);
    load();
  };

  if (loading) return <Spinner />;
  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-brand text-lg">Curriculum ({days.length} days)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {days.map((d) => (
          <div key={d.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5">
            <div><span className="text-xs text-slate-400">Day {d.day}</span> <span className="text-sm font-medium text-slate-800">{d.title}</span>{d.gate && <Badge className="ml-2 bg-brand-gold text-white text-xs">gate</Badge>}</div>
            <Button variant="outline" size="sm" onClick={() => setEdit(d)}>Edit</Button>
          </div>
        ))}
        {edit && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
            <div className="bg-white rounded-xl p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-brand">Edit Day {edit.day}</h3>
              <div><Label className="text-xs">Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label className="text-xs">Why this matters</Label><Textarea rows={3} value={edit.why_it_matters} onChange={(e) => setEdit({ ...edit, why_it_matters: e.target.value })} /></div>
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEdit(null)}>Cancel</Button><Button className="flex-1 bg-brand" onClick={save}>Save</Button></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { const t = await base44.entities.Template.list("title", 50); setTemplates(t); setLoading(false); };
  useEffect(() => { load(); }, []);
  const save = async () => { await base44.entities.Template.update(edit.id, { content: edit.content, title: edit.title }); setEdit(null); load(); };
  if (loading) return <Spinner />;
  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-brand text-lg">Templates ({templates.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5">
            <div><div className="text-sm font-medium text-slate-800">{t.title}</div><div className="text-xs text-slate-400">{t.category}</div></div>
            <Button variant="outline" size="sm" onClick={() => setEdit(t)}>Edit</Button>
          </div>
        ))}
        {edit && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
            <div className="bg-white rounded-xl p-5 max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-brand">Edit template</h3>
              <div><Label className="text-xs">Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label className="text-xs">Content (Markdown)</Label><Textarea rows={12} className="font-mono text-xs" value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></div>
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEdit(null)}>Cancel</Button><Button className="flex-1 bg-brand" onClick={save}>Save</Button></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const [users, profiles, deals, landlords, progress] = await Promise.all([
        base44.entities.User.list("-created_date", 200),
        base44.entities.OnboardingProfile.list("-created_date", 200),
        base44.entities.Deal.list("-created_date", 200),
        base44.entities.Landlord.list("-created_date", 200),
        base44.entities.UserTaskProgress.list("-created_date", 200)
      ]);
      setData({ users, profiles, deals, landlords, progress });
    })();
  }, []);
  if (!data) return <Spinner />;
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

function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const l = await base44.entities.AuditLog.list("-created_date", 100);
        setLogs(l);
      } catch (e) { setLogs([]); }
      setLoading(false);
    })();
  }, []);
  if (loading) return <Spinner />;
  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-brand text-lg">Audit Log (append-only)</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {logs.length === 0 && <p className="text-sm text-slate-400">No audit entries yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-start gap-3 text-sm border-b border-slate-100 py-1.5 last:border-0">
            <Badge variant="outline" className="text-xs shrink-0">{l.action}</Badge>
            <div className="min-w-0">
              <span className="text-slate-700">{l.actor_email}</span>
              <span className="text-slate-400"> · {l.details}</span>
              {l.target_user_email && <span className="text-xs text-slate-400"> → {l.target_user_email}</span>}
              <div className="text-xs text-slate-400">{l.created_date?.slice(0, 16).replace("T", " ")}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return <Card className="border-slate-200"><CardContent className="py-4"><div className="text-2xl font-bold text-brand">{value}</div><div className="text-xs text-slate-400">{label}</div></CardContent></Card>;
}
function Spinner() { return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>; }