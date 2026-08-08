import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "./WorkspaceShared";

export default function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const t = await base44.entities.Template.list("title", 50);
      setTemplates(t);
    } catch (e) {
      console.error("Templates load failed", e);
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
      await base44.entities.Template.update(edit.id, { content: edit.content, title: edit.title });
      setEdit(null);
      load();
    } catch (e) {
      console.error("Template save failed", e);
      setError("We couldn't save this yet. Your edits are still here — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load templates right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
    </div>
  );
  return (
    <Card className="border-brand-line">
      <CardHeader><CardTitle className="text-brand-text text-lg">Templates ({templates.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between border border-brand-line rounded-lg p-2.5 bg-brand-raised">
            <div><div className="text-sm font-medium text-brand-text">{t.title}</div><div className="text-xs text-brand-mutedtext">{t.category}</div></div>
            <Button variant="outline" size="sm" className="border-brand-line text-brand-text" onClick={() => setEdit(t)}>Edit</Button>
          </div>
        ))}
        {edit && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
            <div className="bg-brand-surface border border-brand-line rounded-xl p-5 max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-brand-text">Edit template</h3>
              <div><Label className="text-xs text-brand-mutedtext">Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label className="text-xs text-brand-mutedtext">Content (Markdown)</Label><Textarea rows={12} className="font-mono text-xs" value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2"><Button variant="outline" className="flex-1 border-brand-line text-brand-text" onClick={() => setEdit(null)}>Cancel</Button><Button className="flex-1 bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}