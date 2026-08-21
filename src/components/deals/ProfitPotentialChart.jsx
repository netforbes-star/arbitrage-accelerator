import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TOOLTIP_STYLE = { background: "#11122B", border: "1px solid #2A2B4F", borderRadius: 8, color: "#F2F3FA", fontSize: 12 };

/**
 * Cumulative potential cash profit across the active pipeline — deals still
 * being worked (not declined/"passed" and not "lost"), ordered by created date
 * so the line shows profit building as deals enter the pipeline.
 */
export default function ProfitPotentialChart({ deals }) {
  const active = deals
    .filter((d) => d.status !== "passed" && d.status !== "lost")
    .slice()
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  if (active.length === 0) return null;

  let cumulative = 0;
  const data = active.map((d, i) => {
    cumulative += d.cash_profit || 0;
    return { name: d.nickname || `Deal ${i + 1}`, cumulative: Math.round(cumulative) };
  });

  const total = active.reduce((s, d) => s + (d.cash_profit || 0), 0);

  return (
    <Card className="border-brand-line">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-brand-text text-lg">Cumulative potential profit</CardTitle>
          <span className="text-sm text-brand-mutedtext">{active.length} active deal{active.length === 1 ? "" : "s"} · ${Math.round(total)}/mo</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CDAA4C" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#CDAA4C" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2A2B4F" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#A9ACC9", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#2A2B4F" }} />
              <YAxis tick={{ fill: "#A9ACC9", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`$${v}/mo`, "Cumulative"]} cursor={{ stroke: "#2A2B4F" }} />
              <Area type="monotone" dataKey="cumulative" stroke="#CDAA4C" strokeWidth={2} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}