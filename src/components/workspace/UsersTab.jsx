import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save } from "lucide-react";
import { Spinner } from "./WorkspaceShared";

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [u, p] = await Promise.all([
        base44.entities.User.list("-created_date", 200),
        base44.entities.OnboardingProfile.list("-created_date", 200)
      ]);
      setUsers(u);
      setProfiles(p);
    } catch (e) {
      console.error("Users load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const profileFor = (uid) => profiles.find((p) => p.created_by_id === uid);
  const setField = (uid, field, val) => setEdits((e) => ({ ...e, [uid]: { ...e[uid], [field]: val } }));

  const saveUser = async (u) => {
    const patch = edits[u.id] || {};
    const oldRole = u.role;
    const newRole = patch.role || oldRole;
    const cohort = patch.cohort !== undefined ? patch.cohort : u.cohort;
    setError("");
    setSavingId(u.id);
    try {
      await base44.entities.User.update(u.id, { role: newRole, cohort });
      // No coach assignment: there is one coach, and staff see every host.
      if (newRole !== oldRole) logAudit("role_change", `Changed ${u.email} role from ${oldRole} to ${newRole}`, u.email);
      setEdits((e) => ({ ...e, [u.id]: {} }));
      load();
    } catch (e) {
      console.error("User update failed", e);
      setError("We couldn't save this user yet. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load users right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
    </div>
  );

  return (
    <Card className="border-brand-line">
      <CardHeader><CardTitle className="text-brand-text text-lg">Users ({users.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>}
        <p className="text-xs text-brand-mutedtext">Note: passwords and authentication credentials are never shown or editable here.</p>
        {users.map((u) => {
          const prof = profileFor(u.id);
          const e = edits[u.id] || {};
          return (
            <div key={u.id} className="border border-brand-line rounded-lg p-3 bg-brand-raised">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-brand-text">{u.email}</div>
                  <div className="text-xs text-brand-mutedtext">{u.full_name || "—"}{u.cohort ? ` · Cohort ${u.cohort}` : ""}</div>
                </div>
                <Badge className={u.role === "admin" ? "bg-brand-gold text-brand-ink" : u.role === "coach" ? "bg-brand-raised text-brand-text" : "bg-brand-raised text-brand-mutedtext"}>{u.role}</Badge>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-brand-mutedtext">Role</Label>
                  <Select value={e.role || u.role} onValueChange={(v) => setField(u.id, "role", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="host">host</SelectItem><SelectItem value="coach">coach</SelectItem><SelectItem value="admin">admin</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-brand-mutedtext">Cohort</Label>
                  <Input className="h-8 text-xs" value={e.cohort !== undefined ? e.cohort : (u.cohort || "")} onChange={(ev) => setField(u.id, "cohort", ev.target.value)} />
                </div>
              </div>
              <Button size="sm" className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90 mt-2" onClick={() => saveUser(u)} disabled={savingId === u.id}>{savingId === u.id ? "Saving…" : <><Save className="w-3 h-3 mr-1" /> Save</>}</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}