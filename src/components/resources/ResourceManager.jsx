import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, EyeOff, Eye, X, Save } from "lucide-react";

const CATEGORIES = [
  "Getting Started",
  "Market Research",
  "Landlord Outreach",
  "Underwriting & Pricing",
  "Operations",
  "Legal & Compliance",
  "Finance & Tax"
];

const EMPTY = {
  title: "",
  url: "",
  source: "",
  author: "",
  description: "",
  category: "Getting Started",
  sort_order: 100,
  is_published: true
};

/**
 * Staff-only CRUD surface for resources. Lists every resource (published and
 * unpublished), and supports create / edit / unpublish / delete so new links
 * can be added without a developer. Reused on the public /resources page
 * (staff section) and inside the Coach Workspace "Resources" tab.
 *
 * `onChanged` is called after any successful mutation so a parent list can
 * refresh its public view.
 */
export default function ResourceManager({ onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await base44.entities.Resource.list("sort_order", 200);
      r.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.title || "").localeCompare(b.title || ""));
      setItems(r);
    } catch (e) {
      console.error("Resources load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setError(""); setEditing({ ...EMPTY }); };
  const openEdit = (r) => { setError(""); setEditing({ ...r }); };

  const save = async () => {
    setError("");
    if (!editing.title?.trim() || !editing.url?.trim()) {
      setError("A title and URL are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editing.title.trim(),
        url: editing.url.trim(),
        source: editing.source || "",
        author: editing.author || "",
        description: editing.description || "",
        category: editing.category || "Getting Started",
        sort_order: Number(editing.sort_order) || 100,
        is_published: !!editing.is_published
      };
      if (editing.id) {
        await base44.entities.Resource.update(editing.id, payload);
      } else {
        await base44.entities.Resource.create(payload);
      }
      setEditing(null);
      await load();
      onChanged?.();
    } catch (e) {
      console.error("Resource save failed", e);
      setError("We couldn't save this resource yet. Your edits are still here — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (r) => {
    try {
      await base44.entities.Resource.update(r.id, { is_published: !r.is_published });
      await load();
      onChanged?.();
    } catch (e) {
      console.error("Toggle publish failed", e);
      setError("We couldn't change that resource's visibility right now.");
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"? This can't be undone.`)) return;
    try {
      await base44.entities.Resource.delete(r.id);
      await load();
      onChanged?.();
    } catch (e) {
      console.error("Resource delete failed", e);
      setError("We couldn't delete that resource right now.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-brand-mutedtext">We couldn't load resources right now.</p>
        <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-text">All resources ({items.length})</h3>
        <Button size="sm" className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Add resource
        </Button>
      </div>
      {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>}
      {items.length === 0 && <p className="text-sm text-brand-mutedtext">No resources yet. Add your first link above.</p>}
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between border border-brand-line rounded-lg p-3 bg-brand-raised gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-brand-text truncate">{r.title}</div>
              <div className="text-xs text-brand-mutedtext truncate">{r.category} · {r.is_published ? "Published" : "Unpublished"}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => togglePublish(r)} title={r.is_published ? "Unpublish" : "Publish"}>
                {r.is_published ? <EyeOff className="w-4 h-4 text-brand-mutedtext" /> : <Eye className="w-4 h-4 text-brand-gold" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit"><Pencil className="w-4 h-4 text-brand-mutedtext" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(r)} title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-brand-surface border border-brand-line rounded-xl p-5 max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-brand-text">{editing.id ? "Edit resource" : "Add resource"}</h3>
              <button onClick={() => setEditing(null)} className="text-brand-mutedtext"><X className="w-5 h-5" /></button>
            </div>
            <div><Label className="text-xs text-brand-mutedtext">Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label className="text-xs text-brand-mutedtext">URL</Label><Input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://…" /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs text-brand-mutedtext">Source / site</Label><Input value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })} /></div>
              <div><Label className="text-xs text-brand-mutedtext">Author</Label><Input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs text-brand-mutedtext">Description</Label><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-brand-mutedtext">Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-brand-mutedtext">Sort order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-text">
              <input type="checkbox" checked={!!editing.is_published} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
              Published
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-brand-line text-brand-text" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="flex-1 bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={save} disabled={saving}>
                {saving ? "Saving…" : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}