import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { analyzeDeal, DEAL_STATUSES } from "@/lib/dealMath";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calculator, Plus, TrendingUp, TrendingDown, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";

const EMPTY = {
  nickname: "", beds: 2, baths: 1, monthly_rent: "", utilities: "", furnishing_cost: "",
  deposit: "", drive_time_minutes: "", location_score: "", size_score: "", condition_score: "",
  str_revenue_estimate: "", mtr_revenue_estimate: "",
  adr_override: "", occupancy_override: "", cost_ratio_override: "", override_reason: "",
  permission_type: "none", permission_artifact_url: "", status: "evaluating"
};

export default function DealAnalyzer() {
  const { coachId } = useHostProfile();
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const d = await base44.entities.Deal.list("-created_date", 100);
    setDeals(d);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const result = useMemo(() => analyzeDeal(form), [form]);

  const usingOverrides = form.adr_override !== "" || form.occupancy_override !== "" || form.cost_ratio_override !== "";

  const reset = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); };

  const save = async () => {
    setError("");
    if (!form.nickname) { setError("Add a nickname or address first."); return; }
    if (form.status === "lease signed" && !form.permission_artifact_url) {
      setError("A deal can't be marked 'lease signed' without an uploaded written-permission artifact. Upload evidence first (Day 20 gate).");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      beds: Number(form.beds) || 0, baths: Number(form.baths) || 0,
      monthly_rent: Number(form.monthly_rent) || 0, utilities: Number(form.utilities) || 0,
      furnishing_cost: Number(form.furnishing_cost) || 0, deposit: Number(form.deposit) || 0,
      drive_time_minutes: Number(form.drive_time_minutes) || 0,
      location_score: Number(form.location_score) || 0, size_score: Number(form.size_score) || 0,
      condition_score: Number(form.condition_score) || 0,
      str_revenue_estimate: Number(form.str_revenue_estimate) || 0,
      mtr_revenue_estimate: Number(form.mtr_revenue_estimate) || 0,
      adr_override: form.adr_override === "" ? null : Number(form.adr_override),
      occupancy_override: form.occupancy_override === "" ? null : Number(form.occupancy_override),
      cost_ratio_override: form.cost_ratio_override === "" ? null : Number(form.cost_ratio_override),
      all_in_monthly_cost: Math.round(result.allInCost),
      conservative_str_profit: Math.round(result.strProfit),
      conservative_mtr_profit: Math.round(result.mtrProfit),
      profit_margin_pct: Math.round(result.strMargin),
      months_to_recoup: result.monthsToRecoup ? Math.round(result.monthsToRecoup * 10) / 10 : null,
      recommended_strategy: result.recommended,
      verdict: result.verdict,
      fail_fix: result.failFix,
      coach_id: coachId
    };
    try {
      if (editingId) await base44.entities.Deal.update(editingId, payload);
      else await base44.entities.Deal.create(payload);
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (d) => {
    setEditingId(d.id);
    setForm({ ...EMPTY, ...d, adr_override: d.adr_override ?? "", occupancy_override: d.occupancy_override ?? "", cost_ratio_override: d.cost_ratio_override ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => { await base44.entities.Deal.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>;

  const pass = result.verdict === "PASS";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand flex items-center gap-2"><Calculator className="w-6 h-6" /> Deal Analyzer</h1>
        <p className="text-slate-500 text-sm">Conservative by default. Every run saves as a Deal you can track through to lease signing.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-slate-200">
          <CardHeader><CardTitle className="text-brand">{editingId ? "Edit deal" : "New deal"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Address / nickname"><Input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="123 Main St" /></Field>
              <Field label="Beds"><Input type="number" value={form.beds} onChange={(e) => set("beds", e.target.value)} /></Field>
              <Field label="Baths"><Input type="number" value={form.baths} onChange={(e) => set("baths", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Monthly rent ($)"><Input type="number" value={form.monthly_rent} onChange={(e) => set("monthly_rent", e.target.value)} /></Field>
              <Field label="Utilities ($)"><Input type="number" value={form.utilities} onChange={(e) => set("utilities", e.target.value)} /></Field>
              <Field label="Furnishing cost ($)"><Input type="number" value={form.furnishing_cost} onChange={(e) => set("furnishing_cost", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Deposit ($)"><Input type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} /></Field>
              <Field label="Drive time (min)"><Input type="number" value={form.drive_time_minutes} onChange={(e) => set("drive_time_minutes", e.target.value)} /></Field>
              <Field label="Location 1-10"><Input type="number" min="1" max="10" value={form.location_score} onChange={(e) => set("location_score", e.target.value)} /></Field>
              <Field label="Size 1-10"><Input type="number" min="1" max="10" value={form.size_score} onChange={(e) => set("size_score", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Condition 1-10"><Input type="number" min="1" max="10" value={form.condition_score} onChange={(e) => set("condition_score", e.target.value)} /></Field>
              <Field label="STR revenue est. ($/mo)"><Input type="number" value={form.str_revenue_estimate} onChange={(e) => set("str_revenue_estimate", e.target.value)} /></Field>
              <Field label="MTR revenue est. ($/mo)"><Input type="number" value={form.mtr_revenue_estimate} onChange={(e) => set("mtr_revenue_estimate", e.target.value)} /></Field>
            </div>

            <details className="border-t border-slate-100 pt-3">
              <summary className="text-sm font-medium text-slate-600 cursor-pointer">Override conservative assumptions (requires a logged reason)</summary>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <Field label={`ADR ($/night) — default ${Math.min(120, form.str_revenue_estimate ? form.str_revenue_estimate / 30 : 120).toFixed(0)}`}><Input type="number" value={form.adr_override} onChange={(e) => set("adr_override", e.target.value)} placeholder="leave blank for default" /></Field>
                <Field label="Occupancy — default 60%"><Input type="number" step="0.01" value={form.occupancy_override} onChange={(e) => set("occupancy_override", e.target.value)} placeholder="0.6" /></Field>
                <Field label="Cost ratio — default 30%"><Input type="number" step="0.01" value={form.cost_ratio_override} onChange={(e) => set("cost_ratio_override", e.target.value)} placeholder="0.3" /></Field>
              </div>
              <Field label="Reason for override"><Textarea rows={2} value={form.override_reason} onChange={(e) => set("override_reason", e.target.value)} placeholder="Why are you adjusting the conservative default?" /></Field>
            </details>

            <div className="grid sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <Field label="Written permission type">
                <Select value={form.permission_type} onValueChange={(v) => set("permission_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None yet</SelectItem>
                    <SelectItem value="verbal">Verbal (not permission)</SelectItem>
                    <SelectItem value="email">Email reply</SelectItem>
                    <SelectItem value="signed">Signed addendum</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Evidence URL (upload link)"><Input value={form.permission_artifact_url} onChange={(e) => set("permission_artifact_url", e.target.value)} placeholder="https://..." /></Field>
            </div>
            {form.permission_type === "verbal" && <p className="text-xs text-amber-600">Verbal permission is not permission — a change in property management ends it. Get it in writing before marking lease signed.</p>}

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Deal status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-brand hover:bg-brand-bright flex-1">{saving ? "Saving…" : editingId ? "Update deal" : "Save deal"}</Button>
              {editingId && <Button variant="outline" onClick={reset}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-2 ${pass ? "border-green-500/40" : "border-amber-500/40"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-brand">Verdict</CardTitle>
              {pass ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-amber-500" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`text-3xl font-extrabold ${pass ? "text-green-600" : "text-amber-500"}`}>{pass ? "PURSUE THIS DEAL" : "FAIL"}</div>
            <div className="text-sm text-slate-500">Recommended strategy: <span className="font-medium text-slate-700">{result.recommended}</span></div>
            {usingOverrides && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Using overrides — reason required</Badge>}
            <Row label="ADR used" value={`$${result.adr.toFixed(0)}/night`} />
            <Row label="Occupancy" value={`${(result.occupancy * 100).toFixed(0)}%`} />
            <Row label="Gross STR revenue" value={`$${Math.round(result.grossStr)}/mo`} />
            <Row label="All-in monthly cost" value={`$${Math.round(result.allInCost)}/mo`} />
            <div className="border-t border-slate-100 pt-2">
              <Row label="Conservative STR profit" value={`$${Math.round(result.strProfit)}/mo`} bold />
              <Row label="Conservative MTR profit" value={`$${Math.round(result.mtrProfit)}/mo`} />
              <Row label="Profit margin" value={`${Math.round(result.strMargin)}%`} />
              {result.monthsToRecoup && <Row label="Months to recoup furnishing" value={`${result.monthsToRecoup.toFixed(1)}`} />}
            </div>
            {!pass && <p className="text-sm text-slate-600 bg-amber-50 p-3 rounded-lg">{result.failFix}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-brand">Saved deals ({deals.length})</h2>
        {deals.length === 0 && <p className="text-sm text-slate-400">No deals yet. Run your first property above.</p>}
        <div className="space-y-2">
          {deals.map((d) => (
            <Card key={d.id} className="border-slate-200">
              <CardContent className="flex items-center justify-between py-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 truncate">{d.nickname}</span>
                    <Badge variant="outline" className="text-xs">{d.beds}BR/{d.baths}BA</Badge>
                    <Badge className={d.verdict === "PASS" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{d.verdict}</Badge>
                    <Badge variant="secondary" className="text-xs">{d.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{d.recommended_strategy} · ~${d.conservative_str_profit}/mo profit</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => edit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-bold text-brand" : "font-medium text-slate-800"}>{value}</span>
    </div>
  );
}