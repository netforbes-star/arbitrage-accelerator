import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, MessageSquare, Calculator, Handshake, TrendingUp } from "lucide-react";

export default function Graduation() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const [deals, landlords, logs] = await Promise.all([
        base44.entities.Deal.list("-created_date", 100),
        base44.entities.Landlord.list("-created_date", 200),
        base44.entities.OutreachLog.list("-created_date", 200)
      ]);
      setData({ deals, landlords, logs });
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>;

  const contacted = data.landlords.filter((l) => l.stage !== "not contacted").length;
  const conversations = data.landlords.filter((l) => ["conversation held", "property viewed", "negotiating", "won"].includes(l.stage)).length;
  const signed = data.deals.filter((d) => d.status === "lease signed").length;
  const projected = data.deals.filter((d) => d.verdict === "PASS").reduce((s, d) => s + (d.conservative_str_profit || 0), 0);

  let diagnosis = "";
  if (signed > 0) {
    diagnosis = `You signed ${signed} deal${signed > 1 ? "s" : ""} — that's the whole game. Now protect it: get written STR permission on file, separate the bank account, and run your turnover SOP like clockwork.`;
  } else if (conversations >= 3) {
    diagnosis = `You held ${conversations} conversations but didn't close. Your funnel is working at the top. Push the negotiation step: assemble the term sheet (Day 19) and the written permission addendum (Day 20). The deals are there — they need closing language.`;
  } else if (contacted >= 20) {
    diagnosis = `You sent ${contacted} outreaches but only ${conversations} turned into conversations. The volume is right; the conversion needs work. Revisit the value prop (Day 8) and the objection library (Day 13), and switch more touches to phone — automation warms, the call closes.`;
  } else {
    diagnosis = `You contacted ${contacted} landlords — under the 100-contact target. This is the app doing its job: no pipeline, no deal. The fix is volume. Run the daily send queue (Day 12) until you hit 100, then come back to underwriting.`;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-gold flex items-center justify-center mx-auto mb-3"><Trophy className="w-8 h-8 text-white" /></div>
        <h1 className="text-2xl font-bold text-brand">Graduation — Day 28</h1>
        <p className="text-slate-500 text-sm">Your 28-day results, and a diagnosis from your own funnel data.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Result icon={Users} value={contacted} label="Landlords contacted" goal="100" />
        <Result icon={MessageSquare} value={conversations} label="Conversations held" goal="10-15" />
        <Result icon={Calculator} value={data.deals.length} label="Deals underwritten" goal="8-10" />
        <Result icon={Handshake} value={signed} label="Deals signed" goal="1+" />
      </div>

      <Card className="border-brand-gold/40 bg-brand-gold/5">
        <CardHeader><CardTitle className="text-brand flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Projected monthly profit</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-extrabold text-brand">${projected}/mo</div><div className="text-xs text-slate-500">from {data.deals.filter((d) => d.verdict === "PASS").length} passing deal(s)</div></CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-brand">Your diagnosis</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-700 leading-relaxed">{diagnosis}</p></CardContent>
      </Card>

      {signed === 0 && (
        <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
          A deal you didn't sign isn't a failure — it's data. The number that has to change is right above. Adjust and run the sprint again.
        </div>
      )}
      <Button variant="outline" className="w-full border-brand text-brand" onClick={() => window.history.back()}>Back to dashboard</Button>
    </div>
  );
}

function Result({ icon: Icon, value, label, goal }) {
  return (
    <Card className="border-slate-200"><CardContent className="py-4 text-center"><Icon className="w-5 h-5 text-brand mx-auto mb-1" /><div className="text-2xl font-bold text-brand">{value}</div><div className="text-xs text-slate-400">goal {goal}</div><div className="text-xs text-slate-500 mt-0.5">{label}</div></CardContent></Card>
  );
}