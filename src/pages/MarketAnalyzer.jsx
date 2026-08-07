import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { analyzeMarket, REGULATION_STATUSES } from "@/lib/marketMath";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

const EMPTY = {
  city: "", state: "", submarket: "", adr: "", occupancy_rate: "", revpar: "", active_listings: "",
  comp_count: "", comp_revenue_low: "", comp_revenue_median: "", comp_revenue_high: "",
  average_market_rent: "", regulation_status: "pending", regulation_source_url: "", regulation_evidence_url: "",
  data_pulled_date: "", summary: ""
};

export default function MarketAnalyzer() {
  const { coachId } = useHostProfile();
  const [markets, setMarkets] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const m = await base44.entities.Market.list("-created_date", 100);
    setMarkets(m);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const result = useMemo(() => analyzeMarket(form), [form]);

  const save = async () => {
    setSaving(true);
    await base44.entities.Market.create({
      ...form,
      adr: Number(form.adr) || 0, occupancy_rate: Number(form.occupancy_rate) || 0, revpar: Number(form.revpar) || 0,
      active_listings: Number(form.active_listings) || 0, comp_count: Number(form.comp_count) || 0,
      comp_revenue_low: Number(form.comp_revenue_low) || 0, comp_revenue_median: Number(form.comp_revenue_median) || 0,
      comp_revenue_high: Number(form.comp_revenue_high) || 0, average_market_rent: Number(form.average_market_rent) || 0,
      arbitrage_spread: result.arbitrage_spread, spread_ratio: result.spread_ratio, composite_score: result.composite_score,
      recommendation: result.recommendation, stale_data_flag: result.stale_data_flag, thin_market_flag: result.thin_market_flag,
      coach_id: coachId
    });
    setForm({ ...EMPTY });
    load();
    setSaving(false);
  };

  const remove = async (id) => { await base44.entities.Market.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>;

  const rec = result.recommendation;
  const recColor = rec === "go" ? "green" : rec === "hold" ? "amber" : "red";
  const recLabel = { go: "GO", hold: "HOLD", no_go: "NO-GO" }[rec];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand flex items-center gap-2"><MapPin className="w-6 h-6" /> Market Analyzer</h1>
        <p className="text-slate-500 text-sm">Score a market across five components. Regulation is non-negotiable — one ordinance can make a market unviable overnight.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-slate-200">
          <CardHeader><CardTitle className="text-brand">Market data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Nashville" /></Field>
              <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="TN" /></Field>
              <Field label="Submarket"><Input value={form.submarket} onChange={(e) => set("submarket", e.target.value)} placeholder="East Nash" /></Field>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="ADR ($/night)"><Input type="number" value={form.adr} onChange={(e) => set("adr", e.target.value)} /></Field>
              <Field label="Occupancy %"><Input type="number" value={form.occupancy_rate} onChange={(e) => set("occupancy_rate", e.target.value)} placeholder="62" /></Field>
              <Field label="RevPAR ($/night)"><Input type="number" value={form.revpar} onChange={(e) => set("revpar", e.target.value)} /></Field>
              <Field label="Active listings"><Input type="number" value={form.active_listings} onChange={(e) => set("active_listings", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Comp count"><Input type="number" value={form.comp_count} onChange={(e) => set("comp_count", e.target.value)} /></Field>
              <Field label="Comp rev low ($/mo)"><Input type="number" value={form.comp_revenue_low} onChange={(e) => set("comp_revenue_low", e.target.value)} /></Field>
              <Field label="Comp rev median ($/mo)"><Input type="number" value={form.comp_revenue_median} onChange={(e) => set("comp_revenue_median", e.target.value)} /></Field>
              <Field label="Comp rev high ($/mo)"><Input type="number" value={form.comp_revenue_high} onChange={(e) => set("comp_revenue_high", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Average market rent ($/mo)"><Input type="number" value={form.average_market_rent} onChange={(e) => set("average_market_rent", e.target.value)} /></Field>
              <Field label="Data pulled date"><Input type="date" value={form.data_pulled_date} onChange={(e) => set("data_pulled_date", e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Regulation status">
                <Select value={form.regulation_status} onValueChange={(v) => set("regulation_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGULATION_STATUSES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Regulation source URL"><Input value={form.regulation_source_url} onChange={(e) => set("regulation_source_url", e.target.value)} placeholder="city.gov/short-term-rentals" /></Field>
            </div>
            <Field label="Regulation evidence URL (screenshot)"><Input value={form.regulation_evidence_url} onChange={(e) => set("regulation_evidence_url", e.target.value)} /></Field>
            <Button onClick={save} disabled={saving || !form.city} className="w-full bg-brand"><Plus className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save market"}</Button>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-2 ${recColor === "green" ? "border-green-500/40" : recColor === "amber" ? "border-amber-500/40" : "border-red-500/40"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-brand">Recommendation</CardTitle>
              {rec === "go" ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : rec === "hold" ? <Clock className="w-7 h-7 text-amber-500" /> : <XCircle className="w-7 h-7 text-red-500" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`text-3xl font-extrabold ${recColor === "green" ? "text-green-600" : recColor === "amber" ? "text-amber-500" : "text-red-500"}`}>{recLabel}</div>

            {result.regulation_forced_no_go && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>One ordinance can make a market unviable overnight. With regulation <strong>{form.regulation_status}</strong>, this step is non-negotiable — the recommendation is forced to NO-GO regardless of score.</span>
              </div>
            )}

            <Row label="Arbitrage spread" value={`$${result.arbitrage_spread}/mo`} />
            <Row label="Spread ratio" value={`${result.spread_ratio}x`} hint={result.spread_ratio < 2 ? "under 2x = No-Go" : result.spread_ratio <= 2.5 ? "2–2.5x = Hold" : "over 2.5x = Go"} />
            <div className="border-t border-slate-100 pt-2">
              <div className="text-sm font-medium text-slate-700 mb-1">Composite score: <span className="text-brand font-bold">{result.composite_score}/100</span></div>
              <div className="space-y-1">
                <CompRow label="ADR" value={result.components.adr} />
                <CompRow label="Occupancy" value={result.components.occupancy} />
                <CompRow label="Regulation" value={result.components.regulation} />
                <CompRow label="Supply" value={result.components.supply} />
                <CompRow label="Spread" value={result.components.spread} />
              </div>
              {result.staleDeduction > 0 && <div className="text-xs text-red-600 mt-1">−{result.staleDeduction} pts — data over 6 months old (stale)</div>}
            </div>

            {result.thin_market_flag && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2.5 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0" /> Thin market — fewer than 10 comps. Proceed with caution.</div>
            )}
            {result.stale_data_flag && !result.staleDeduction && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2.5 rounded-lg"><Clock className="w-4 h-4 shrink-0" /> Data is over 6 months old.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-brand">Saved markets ({markets.length})</h2>
        {markets.length === 0 && <p className="text-sm text-slate-400">No markets yet. Score your first market above.</p>}
        {markets.map((m) => (
          <Card key={m.id} className="border-slate-200">
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{m.city}{m.state ? `, ${m.state}` : ""}</span>
                  {m.submarket && <span className="text-xs text-slate-400">{m.submarket}</span>}
                  <Badge className={m.recommendation === "go" ? "bg-green-100 text-green-700" : m.recommendation === "hold" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{(m.recommendation || "").toUpperCase()}</Badge>
                  <Badge variant="outline" className="text-xs">{m.composite_score}/100</Badge>
                  {m.thin_market_flag && <Badge variant="secondary" className="text-xs">thin</Badge>}
                  {m.stale_data_flag && <Badge variant="secondary" className="text-xs">stale</Badge>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">spread {m.spread_ratio}x · {m.regulation_status}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">{label}</Label>{children}</div>;
}
function Row({ label, value, hint }) {
  return <div className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{value}{hint && <span className="text-xs text-slate-400 ml-1">({hint})</span>}</span></div>;
}
function CompRow({ label, value }) {
  return <div className="flex justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-700">{value}/20</span></div>;
}