import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Home, Save } from "lucide-react";

export default function BuyBoxSection({ coachId }) {
  const [box, setBox] = useState(null);
  const [form, setForm] = useState({ bedrooms: 2, bathrooms: 1, max_monthly_rent: "", max_drive_time_minutes: "", requires_fenced_yard: false, pets_allowed: false, parking_required: false, furnished_allowed_required: false, notes: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.BuyBox.list("-created_date", 1);
      if (list[0]) {
        setBox(list[0]);
        setForm({ bedrooms: list[0].bedrooms ?? 2, bathrooms: list[0].bathrooms ?? 1, max_monthly_rent: list[0].max_monthly_rent ?? "", max_drive_time_minutes: list[0].max_drive_time_minutes ?? "", requires_fenced_yard: !!list[0].requires_fenced_yard, pets_allowed: !!list[0].pets_allowed, parking_required: !!list[0].parking_required, furnished_allowed_required: !!list[0].furnished_allowed_required, notes: list[0].notes || "" });
      }
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, bedrooms: Number(form.bedrooms) || 2, bathrooms: Number(form.bathrooms) || 1, max_monthly_rent: Number(form.max_monthly_rent) || 0, max_drive_time_minutes: Number(form.max_drive_time_minutes) || 0, coach_id: coachId };
    if (box) await base44.entities.BuyBox.update(box.id, payload);
    else { const created = await base44.entities.BuyBox.create(payload); setBox(created); }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center gap-2 mb-1"><Home className="w-4 h-4 text-brand" /><h4 className="font-semibold text-brand text-sm">Your buy box</h4></div>
      <p className="text-xs text-slate-500 mb-3">A 2BR/1BA rents about <strong>40% better</strong> than a 1BR/1BA at the same price point. A property 5 minutes from your portfolio is worth about <strong>twice</strong> one 30 minutes away. Lock these in so you can underwrite in seconds.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bedrooms"><Input type="number" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></Field>
        <Field label="Bathrooms"><Input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></Field>
        <Field label="Max monthly rent ($)"><Input type="number" value={form.max_monthly_rent} onChange={(e) => set("max_monthly_rent", e.target.value)} /></Field>
        <Field label="Max drive time (min)"><Input type="number" value={form.max_drive_time_minutes} onChange={(e) => set("max_drive_time_minutes", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        <Toggle label="Fenced yard required" checked={form.requires_fenced_yard} onChange={(v) => set("requires_fenced_yard", v)} />
        <Toggle label="Pets allowed" checked={form.pets_allowed} onChange={(v) => set("pets_allowed", v)} />
        <Toggle label="Parking required" checked={form.parking_required} onChange={(v) => set("parking_required", v)} />
        <Toggle label="Furnished allowed (required)" checked={form.furnished_allowed_required} onChange={(v) => set("furnished_allowed_required", v)} />
      </div>
      <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <Button size="sm" className="bg-brand mt-2" onClick={save} disabled={saving}><Save className="w-3 h-3 mr-1" /> {saved ? "Saved" : saving ? "Saving…" : "Save buy box"}</Button>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs font-medium text-slate-600">{label}</Label>{children}</div>;
}
function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
      <span className="text-xs text-slate-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}