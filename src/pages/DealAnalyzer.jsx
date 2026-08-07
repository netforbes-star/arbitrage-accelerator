import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeDeal, DEAL_STATUSES } from "@/lib/dealMath";
import { computeDeal } from "@/functions/computeDeal";
import { saveDeal } from "@/functions/saveDeal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calculator, CheckCircle2, XCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";

const EMPTY = {
  nickname: "", beds: 2, baths: 1, monthly_rent: "", utilities: "", furnishing_cost: "",
  deposit: "", drive_time_minutes: "", location_score: "", size_score: "", condition_score: "",
  revenue_mode: "nightly", nightly_adr: "", monthly_str_revenue: "", occupancy: "0.6", conservatism_haircut: "0.15", haircut_override_reason: "",
  mtr_revenue_estimate: "", permission_type: "none", permission_artifact_url: "", status: "evaluating"
};

export default function DealAnalyzer() {

  const queryClient = useQueryClient();
  const dealsQuery = useQuery({ queryKey: ["deals"], queryFn: () => base44.entities.Deal.list("-created_date", 100) });
  const deals = dealsQuery.data || [];

  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const result = useMemo(() => analyzeDeal(form), [form]);
  const monthly = form.revenue_mode === "monthly";

  const reset = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); };

  const saveMutation = useMutation({
    mutationFn: ({ deal_id, fields }) => saveDeal({ deal_id, fields }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const prev = queryClient.getQueryData(["deals"]);
      queryClient.setQueryData(["deals"], (old) => (old || []).filter((d) => d.id !== id));
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["deals"], ctx.prev);
      setError("We couldn't remove this record. Nothing was changed — please try again.");
    }
  });

  const save = async () => {
    setError("");
    if (!form.nickname) { setError("Add a nickname or address first."); return; }
    setSaving(true);
    let calc;
    try {
      const res = await computeDeal({
        revenue_mode: form.revenue_mode,
        nightly_adr: Number(form.nightly_adr) || 0,
        monthly_str_revenue: Number(form.monthly_str_revenue) || 0,
        occupancy: Number(form.occupancy) || 0.6,
        conservatism_haircut: Number(form.conservatism_haircut) || 0.15,
        monthly_rent: Number(form.monthly_rent) || 0,
        utilities: Number(form.utilities) || 0,
        furnishing_cost: Number(form.furnishing_cost) || 0,
        mtr_revenue_estimate: Number(form.mtr_revenue_estimate) || 0
      });
      calc = res.data;
    } catch (e) {
      setError(e.response?.data?.error || "Could not validate this deal. Please try again.");
      setSaving(false);
      return;
    }
    const payload = {
      ...form,
      beds: Number(form.beds) || 0, baths: Number(form.baths) || 0,
      monthly_rent: Number(form.monthly_rent) || 0, utilities: Number(form.utilities) || 0,
      furnishing_cost: Number(form.furnishing_cost) || 0, deposit: Number(form.deposit) || 0,
      drive_time_minutes: Number(form.drive_time_minutes) || 0,
      location_score: Number(form.location_score) || 0, size_score: Number(form.size_score) || 0,
      condition_score: Number(form.condition_score) || 0,
      nightly_adr: Number(form.nightly_adr) || 0, monthly_str_revenue: Number(form.monthly_str_revenue) || 0,
      occupancy: Number(form.occupancy) || 0.6, conservatism_haircut: Number(form.conservatism_haircut) || 0.15,
      mtr_revenue_estimate: Number(form.mtr_revenue_estimate) || 0,
      gross_revenue: calc.gross_revenue,
      variable_costs: calc.variable_costs,
      furniture_reserve: calc.furniture_reserve,
      cash_profit: calc.cash_profit,
      true_profit: calc.true_profit,
      profit_margin_pct: calc.profit_margin_pct,
      months_to_recoup: calc.months_to_recoup,
      recommended_strategy: calc.recommended_strategy,
      verdict: calc.verdict,
      fail_fix: calc.fail_fix
    };
    try {
      await saveMutation.mutateAsync({ deal_id: editingId, fields: payload });
      reset();
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong saving this deal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (d) => {
    setEditingId(d.id);
    setForm({ ...EMPTY, ...d, occupancy: d.occupancy ?? "0.6", conservatism_haircut: d.conservatism_haircut ?? "0.15" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (id) => deleteMutation.mutate(id);

  if (dealsQuery.isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;
  if (dealsQuery.isError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load your deals right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={() => dealsQuery.refetch()}>Try again</Button>
    </div>
  );
  const pass = result.verdict === "PASS";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2"><Calculator className="w-6 h-6 text-brand-gold" /> Deal Analyzer</h1>
        <p className="text-brand-mutedtext text-sm">Two revenue modes. PASS/FAIL is tested against <strong className="text-brand-text">cash profit</strong> at the $500/mo floor. True profit shows what's left after paying yourself for your time.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-brand-line">
          <CardHeader><CardTitle className="text-brand-text">{editingId ? "Edit deal" : "New deal"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Address / nickname"><Input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="123 Main St" /></Field>
              <Field label="Beds"><Input type="number" value={form.beds} onChange={(e) => set("beds", e.target.value)} /></Field>
              <Field label="Baths"><Input type="number" value={form.baths} onChange={(e) => set("baths", e.target.value)} /></Field>
            </div>

            <div className="border border-brand-line rounded-lg p-3 space-y-3 bg-brand-raised">
              <div className="text-sm font-medium text-brand-text">Revenue mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => set("revenue_mode", "nightly")} className={`p-2.5 rounded-lg border text-left ${!monthly ? "border-brand-gold bg-brand-gold/10" : "border-brand-line bg-brand-surface"}`}>
                  <div className="text-sm font-medium text-brand-text">A · Nightly rate from comps</div>
                  <div className="text-xs text-brand-mutedtext">ADR × occupancy × 30</div>
                </button>
                <button type="button" onClick={() => set("revenue_mode", "monthly")} className={`p-2.5 rounded-lg border text-left ${monthly ? "border-brand-gold bg-brand-gold/10" : "border-brand-line bg-brand-surface"}`}>
                  <div className="text-sm font-medium text-brand-text">B · Monthly revenue (AirDNA/PriceLabs)</div>
                  <div className="text-xs text-brand-mutedtext">Used directly, 15% haircut</div>
                </button>
              </div>
              {!monthly ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Nightly ADR ($)"><Input type="number" value={form.nightly_adr} onChange={(e) => set("nightly_adr", e.target.value)} /></Field>
                  <Field label="Occupancy (default 0.6)"><Input type="number" step="0.01" value={form.occupancy} onChange={(e) => set("occupancy", e.target.value)} /></Field>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Monthly STR revenue ($)"><Input type="number" value={form.monthly_str_revenue} onChange={(e) => set("monthly_str_revenue", e.target.value)} /></Field>
                  <Field label="Conservatism haircut (default 0.15)"><Input type="number" step="0.01" value={form.conservatism_haircut} onChange={(e) => set("conservatism_haircut", e.target.value)} /></Field>
                </div>
              )}
              {monthly && form.conservatism_haircut !== "0.15" && (
                <Field label="Reason for overriding the 15% haircut"><Textarea rows={2} value={form.haircut_override_reason} onChange={(e) => set("haircut_override_reason", e.target.value)} /></Field>
              )}
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
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Condition 1-10"><Input type="number" min="1" max="10" value={form.condition_score} onChange={(e) => set("condition_score", e.target.value)} /></Field>
              <Field label="MTR revenue est. ($/mo)"><Input type="number" value={form.mtr_revenue_estimate} onChange={(e) => set("mtr_revenue_estimate", e.target.value)} /></Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 border-t border-brand-line pt-3">
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
              <Field label="Evidence URL"><Input value={form.permission_artifact_url} onChange={(e) => set("permission_artifact_url", e.target.value)} placeholder="https://..." /></Field>
            </div>
            {form.permission_type === "verbal" && <p className="text-xs text-amber-400">Verbal permission is not permission — a change in property management ends it. Get it in writing before marking lease signed.</p>}

            <Field label="Deal status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90 flex-1">{saving ? "Saving…" : editingId ? "Update deal" : "Save deal"}</Button>
              {editingId && <Button variant="outline" className="border-brand-line text-brand-text" onClick={reset}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-2 ${pass ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-brand-text">Verdict</CardTitle>
              {pass ? <CheckCircle2 className="w-7 h-7 text-green-400" /> : <XCircle className="w-7 h-7 text-red-400" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`text-3xl font-extrabold ${pass ? "text-green-400" : "text-red-400"}`}>{pass ? "PURSUE THIS DEAL" : "FAIL"}</div>
            <div className="text-sm text-brand-mutedtext">Recommended strategy: <span className="font-medium text-brand-text">{result.recommended}</span></div>

            <div className="border-t border-brand-line pt-2 space-y-1.5">
              <div className="text-xs uppercase tracking-wide text-brand-mutedtext font-semibold">Revenue</div>
              <Row label={`Gross revenue (${monthly ? "after haircut" : "ADR × occ × 30"})`} value={`$${Math.round(result.grossRevenue)}/mo`} />
              {monthly && <Row label={`− ${Math.round(result.haircut * 100)}% conservatism haircut`} value={`−$${Math.round(result.haircutAmount)}/mo`} muted />}
            </div>
            <div className="border-t border-brand-line pt-2 space-y-1.5">
              <div className="text-xs uppercase tracking-wide text-brand-mutedtext font-semibold">Costs</div>
              <Row label="− Variable costs (30% cleaning/supplies/fees)" value={`−$${Math.round(result.variableCosts)}/mo`} muted />
              <Row label="− Furniture reserve (5%)" value={`−$${Math.round(result.furnitureReserve)}/mo`} muted />
              <Row label="− Rent" value={`−$${Math.round(Number(form.monthly_rent) || 0)}/mo`} muted />
              <Row label="− Utilities" value={`−$${Math.round(Number(form.utilities) || 0)}/mo`} muted />
              <Row label="− Maintenance (min $100)" value={`−$${Math.round(result.maintenance)}/mo`} muted />
            </div>

            <div className="border-t-2 border-brand-gold/40 pt-2">
              <Row label="= CASH PROFIT (verdict basis)" value={`$${Math.round(result.cashProfit)}/mo`} bold />
              <div className="text-xs text-brand-mutedtext">tested against the $500/mo floor</div>
            </div>
            <div className="border-t border-brand-line pt-2">
              <Row label="− Your time ($20/hr × 5hr/wk)" value={`−$${Math.round(result.managementValue)}/mo`} muted />
              <div className="border-t border-brand-line pt-1.5 mt-1.5">
                <Row label="= TRUE PROFIT (after paying yourself)" value={`$${Math.round(result.trueProfit)}/mo`} bold />
              </div>
            </div>

            <div className="flex justify-between text-sm pt-1"><span className="text-brand-mutedtext">Margin</span><span className="font-medium text-brand-text">{Math.round(result.margin)}%</span></div>
            {result.monthsToRecoup && <div className="flex justify-between text-sm"><span className="text-brand-mutedtext">Months to recoup furnishing</span><span className="font-medium text-brand-text">{result.monthsToRecoup.toFixed(1)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-brand-mutedtext">MTR profit (comparison)</span><span className="font-medium text-brand-text">${Math.round(result.mtrProfit)}/mo</span></div>

            {result.timeWarning && (
              <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/10 p-2.5 rounded-lg mt-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Cash profit passes, but true profit is negative. This deal only works if your time is free — consider a property manager or a tighter operation.</span>
              </div>
            )}
            {!pass && <p className="text-sm text-brand-mutedtext bg-red-500/10 text-red-400 p-3 rounded-lg whitespace-pre-line mt-2">{result.failFix}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-text">Saved deals ({deals.length})</h2>
        {deals.length === 0 && <p className="text-sm text-brand-mutedtext">No deals yet. Run your first property above.</p>}
        <div className="space-y-2">
          {deals.map((d) => (
            <Card key={d.id} className="border-brand-line">
              <CardContent className="flex items-center justify-between py-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-brand-text truncate">{d.nickname}</span>
                    <Badge variant="outline" className="text-xs border-brand-line text-brand-text">{d.beds}BR/{d.baths}BA</Badge>
                    <Badge className={d.verdict === "PASS" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}>{d.verdict}</Badge>
                    <Badge variant="secondary" className="text-xs bg-brand-raised text-brand-mutedtext">{d.status}</Badge>
                  </div>
                  <div className="text-xs text-brand-mutedtext mt-0.5">{d.recommended_strategy} · cash ${d.cash_profit}/mo · true ${d.true_profit}/mo</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => edit(d)} className="text-brand-mutedtext hover:text-brand-text"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(d.id)} className="hover:bg-brand-raised"><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-brand-text">{label}</Label>{children}</div>;
}
function Row({ label, value, bold, muted }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? "text-brand-mutedtext" : "text-brand-mutedtext"}>{label}</span>
      <span className={bold ? "font-bold text-brand-gold" : muted ? "font-medium text-brand-mutedtext" : "font-medium text-brand-text"}>{value}</span>
    </div>
  );
}