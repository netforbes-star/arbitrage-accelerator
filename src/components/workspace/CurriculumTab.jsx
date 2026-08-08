import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "./WorkspaceShared";

export default function CurriculumTab() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const d = await base44.entities.ProgramDay.list("day", 50);
      setDays(d.sort((a, b) => a.day - b.day));
    } catch (e) {
      console.error("Curriculum load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await base44.entities.ProgramDay.update(edit.id, { title: edit.title, why_it_matters: edit.why_it_matters });
      setEdit(null);
      load();
    } catch (e) {
      console.error("Curriculum save failed", e);
      setError("We couldn't save this yet. Your edits are still here — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load the curriculum right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
    </div>
  );
  return (
    <Card className="border-brand-line">
      <CardHeader><CardTitle className="text-brand-text text-lg">Curriculum ({days.length} days)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {days.map((d) => (
          <div key={d.id} className="flex items-center justify-between border border-brand-line rounded-lg p-2.5 bg-brand-raised">
            <div><span className="text-xs text-brand-mutedtext">Day {d.day}</span> <span className="text-sm font-medium text-brand-text">{d.title}</span>{d.gate && <Badge className="ml-2 bg-brand-gold text-brand-ink text-xs">gate</Badge>}</div>
            <Button variant="outline" size="sm" className="border-brand-line text-brand-text" onClick={() => setEdit(d)}>Edit</Button>
          </div>
        ))}
        {edit && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
            <div className="bg-brand-surface border border-brand-line rounded-xl p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-brand-text">Edit Day {edit.day}</h3>
              <div><Label className="text-xs text-brand-mutedtext">Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label className="text-xs text-brand-mutedtext">Why this matters</Label><Textarea rows={3} value={edit.why_it_matters} onChange={(e) => setEdit({ ...edit, why_it_matters: e.target.value })} /></div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2"><Button variant="outline" className="flex-1 border-brand-line text-brand-text" onClick={() => setEdit(null)}>Cancel</Button><Button className="flex-1 bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}