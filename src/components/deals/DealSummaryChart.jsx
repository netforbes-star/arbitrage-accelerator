import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEAL_STATUSES, dealStatusLabel } from "@/lib/dealMath";

const VERDICT_COLORS = { PASS: "#4ade80", FAIL: "#f87171", evaluating: "#A9ACC9" };
const STATUS_COLOR = "#CDAA4C";
const TOOLTIP_STYLE = { background: "#11122B", border: "1px solid #2A2B4F", borderRadius: 8, color: "#F2F3FA", fontSize: 12 };

/**
 * At-a-glance summary of a host's saved deals: verdict health (donut) and the
 * status pipeline (horizontal bars), plus a few health stats. Rendered only
 * when there is at least one saved deal.
 */
export default function DealSummaryChart({ deals }) {
  const total = deals.length;
  if (total === 0) return null;

  const verdictData = ["PASS", "FAIL", "evaluating"].map((v) => ({
    name: v,
    value: deals.filter((d) => (d.verdict || "evaluating") === v).length
  })).filter((v) => v.value > 0);

  const statusData = DEAL_STATUSES
    .map((s) => ({ name: dealStatusLabel(s), value: deals.filter((d) => d.status === s).length }))
    .filter((s) => s.value > 0);

  const passed = deals.filter((d) => d.verdict === "PASS").length;
  const signed = deals.filter((d) => d.status === "lease signed").length;
  const avgCash = Math.round(deals.reduce((sum, d) => sum + (d.cash_profit || 0), 0) / total);
  const healthPct = total ? Math.round((passed / total) * 100) : 0;

  return (
    <Card className="border-brand-line">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-brand-text">Pipeline at a glance</CardTitle>
          <span className="text-xs text-brand-mutedtext">{healthPct}% passing</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total deals" value={total} />
          <Stat label="PASS verdicts" value={passed} accent="text-green-400" />
          <Stat label="Leases signed" value={signed} accent="text-brand-gold" />
          <Stat label="Avg cash profit" value={`$${avgCash}/mo`} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-mutedtext font-semibold mb-2">Verdict health</div>
            {verdictData.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={verdictData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
                        {verdictData.map((v) => <Cell key={v.name} fill={VERDICT_COLORS[v.name]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs">
                  {verdictData.map((v) => (
                    <span key={v.name} className="flex items-center gap-1.5 text-brand-mutedtext">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: VERDICT_COLORS[v.name] }} />
                      {v.name} · {v.value}
                    </span>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-brand-mutedtext py-10 text-center">No verdicts yet.</p>}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-brand-mutedtext font-semibold mb-2">Status pipeline</div>
            {statusData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={104} tick={{ fill: "#A9ACC9", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#2A2B4F33" }} />
                    <Bar dataKey="value" fill={STATUS_COLOR} radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-brand-mutedtext py-10 text-center">No statuses yet.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent = "text-brand-text" }) {
  return (
    <div className="border border-brand-line rounded-lg p-3 bg-brand-raised">
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-brand-mutedtext">{label}</div>
    </div>
  );
}