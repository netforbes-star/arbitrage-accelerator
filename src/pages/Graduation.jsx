import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { friendlyError } from "@/lib/friendlyError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, MessageSquare, Calculator, Handshake, TrendingUp } from "lucide-react";

export default function Graduation() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const [deals, landlords, logs] = await Promise.all([
          base44.entities.Deal.list("-created_date", 100),
          base44.entities.Landlord.list("-created_date", 200),
          base44.entities.OutreachLog.list("-created_date", 200)
        ]);
        setData({ deals, landlords, logs });
      } catch (e) {
        setError(friendlyError(e, "We couldn't load your results. Refresh the page to try again."));
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-4 text-center">
        <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-300">{error}</div>
        <Link to="/"><Button variant="outline" className="border-brand-line text-brand-text">Back to dashboard</Button></Link>
      </div>
    );
  }

  if (!data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;

  const contacted = data.landlords.filter((l) => l.stage !== "not contacted").length;
  const conversations = data.landlords.filter((l) => ["conversation held", "property viewed", "negotiating", "won"].includes(l.stage)).length;
  const signed = data.deals.filter((d) => d.status === "lease signed").length;
  const projected = data.deals.filter((d) => d.verdict === "PASS").reduce((s, d) => s + (d.cash_profit || 0), 0);

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
        <div className="w-16 h-16 rounded-2xl bg-brand-gold flex items-center justify-center mx-auto mb-3"><Trophy className="w-8 h-8 text-brand-ink" /></div>
        <h1 className="text-2xl font-bold text-brand-text">Graduation — Day 28</h1>
        <p className="text-brand-mutedtext text-sm">Your 28-day results, and a diagnosis from your own funnel data.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Result icon={Users} value={contacted} label="Landlords contacted" goal="100" />
        <Result icon={MessageSquare} value={conversations} label="Conversations held" goal="10-15" />
        <Result icon={Calculator} value={data.deals.length} label="Deals underwritten" goal="8-10" />
        <Result icon={Handshake} value={signed} label="Deals signed" goal="1+" />
      </div>

      <Card className="border-brand-gold/40 bg-brand-gold/10">
        <CardHeader><CardTitle className="text-brand-text flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-gold" /> Projected monthly profit</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-extrabold text-brand-gold">${projected}/mo</div><div className="text-xs text-brand-mutedtext">from {data.deals.filter((d) => d.verdict === "PASS").length} passing deal(s)</div></CardContent>
      </Card>

      <Card className="border-brand-line">
        <CardHeader><CardTitle className="text-brand-text">Your diagnosis</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-brand-mutedtext leading-relaxed">{diagnosis}</p></CardContent>
      </Card>

      {signed === 0 && (
        <div className="text-center text-sm text-brand-mutedtext bg-brand-raised rounded-lg p-4 border border-brand-line">
          A deal you didn't sign isn't a failure — it's data. The number that has to change is right above. Adjust and run the sprint again.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/program"><Button variant="outline" className="w-full border-brand-line text-brand-text">Back to program</Button></Link>
        <Link to="/"><Button variant="outline" className="w-full border-brand-line text-brand-text">Dashboard</Button></Link>
      </div>
    </div>
  );
}

function Result({ icon: Icon, value, label, goal }) {
  return (
    <Card className="border-brand-line"><CardContent className="py-4 text-center"><Icon className="w-5 h-5 text-brand-gold mx-auto mb-1" /><div className="text-2xl font-bold text-brand-text">{value}</div><div className="text-xs text-brand-mutedtext">goal {goal}</div><div className="text-xs text-brand-mutedtext mt-0.5">{label}</div></CardContent></Card>
  );
}