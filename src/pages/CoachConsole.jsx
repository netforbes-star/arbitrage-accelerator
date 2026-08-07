import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { getCurrentDay } from "@/lib/curriculum";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, ArrowLeft, AlertTriangle, Send } from "lucide-react";

export default function CoachConsole() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const p = await base44.entities.OnboardingProfile.list("-created_date", 200);
      setProfiles(p);
    } catch (e) {
      console.error("Coach profiles load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openHost = async (p) => {
    setSelected(p);
    setDetail(null);
    setDetailError("");
    logAudit("coach_viewed_host", `Viewed host ${p.created_by} (${p.target_market_city})`, p.created_by);
    try {
      const [progress, deals, landlords, fb] = await Promise.all([
        base44.entities.UserTaskProgress.filter({ created_by_id: p.created_by_id }),
        base44.entities.Deal.filter({ created_by_id: p.created_by_id }),
        base44.entities.Landlord.filter({ created_by_id: p.created_by_id }),
        base44.entities.CoachFeedback.filter({ host_id: p.created_by_id })
      ]);
      setDetail({ progress, deals, landlords, feedback: fb });
    } catch (e) {
      console.error("Coach host detail load failed", e);
      setDetailError("We couldn't load this host's details right now. Please try again.");
    }
  };

  const sendFeedback = async (p) => {
    setDetailError("");
    setSending(true);
    try {
      await base44.entities.CoachFeedback.create({ host_id: p.created_by_id, host_name: p.created_by, message: feedback, section: "general" });
      setFeedback("");
      openHost(p);
    } catch (e) {
      console.error("Coach feedback failed", e);
      setDetailError("We couldn't send this feedback yet. Your message is still here — please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;
  if (loadError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load your hosts right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={load}>Try again</Button>
    </div>
  );

  if (selected) {
    const p = selected;
    const currentDay = getCurrentDay(p.start_date);
    const week = Math.ceil(currentDay / 7);
    const completed = detail.progress.filter((t) => t.status === "complete").length;
    const expectedPace = Math.round((currentDay / 28) * 28);
    const behind = completed < expectedPace - 3;

    return (
      <div className="space-y-5">
        <Button variant="ghost" onClick={() => setSelected(null)} className="text-brand-mutedtext hover:text-brand-text"><ArrowLeft className="w-4 h-4 mr-1" /> Back to hosts</Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">{p.created_by}</h1>
            <p className="text-brand-mutedtext text-sm">{p.target_market_city} · Day {currentDay} · Week {week} · {p.goal_28_day}</p>
          </div>
          {behind && <Badge className="bg-amber-500/15 text-amber-400"><AlertTriangle className="w-3 h-3 mr-1" />At-risk</Badge>}
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <Stat label="Tasks done" value={`${completed}`} />
          <Stat label="Deals underwritten" value={detail.deals.length} />
          <Stat label="Landlords" value={detail.landlords.length} />
          <Stat label="Days behind" value={Math.max(0, expectedPace - completed)} />
        </div>

        <Card className="border-brand-line">
          <CardContent className="py-4">
            <h3 className="font-semibold text-brand-text mb-2">Deals</h3>
            {detail.deals.length === 0 ? <p className="text-sm text-brand-mutedtext">No deals yet.</p> : detail.deals.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-brand-line last:border-0">
                <span className="text-sm text-brand-text">{d.nickname}</span>
                <Badge variant="outline" className="text-xs border-brand-line text-brand-mutedtext">{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-brand-line">
          <CardContent className="py-4">
            <h3 className="font-semibold text-brand-text mb-2">Landlords</h3>
            {detail.landlords.length === 0 ? <p className="text-sm text-brand-mutedtext">No landlords yet.</p> : detail.landlords.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-brand-line last:border-0">
                <span className="text-sm text-brand-text">{l.name}</span>
                <Badge variant="secondary" className="text-xs bg-brand-raised text-brand-mutedtext">{l.stage}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-brand-line">
          <CardContent className="py-4 space-y-3">
            <h3 className="font-semibold text-brand-text">Leave feedback (read-only on host data)</h3>
            {detail.feedback.map((f) => (
              <div key={f.id} className="text-sm text-brand-mutedtext border-l-2 border-brand-gold pl-3">{f.message}<div className="text-xs text-brand-mutedtext mt-0.5">{f.created_date?.slice(0, 10)}</div></div>
            ))}
            <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Encouraging, specific feedback…" />
            {detailError && <p className="text-sm text-red-400">{detailError}</p>}
            <Button className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90" disabled={!feedback || sending} onClick={() => sendFeedback(p)}>{sending ? "Sending…" : <><Send className="w-4 h-4 mr-1" /> Send feedback</>}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2"><ClipboardList className="w-6 h-6 text-brand-gold" /> Coach Console</h1>
        <p className="text-brand-mutedtext text-sm">Hosts assigned to you. You can view artifacts and leave feedback — not edit host data.</p>
      </div>
      {profiles.length === 0 && <p className="text-sm text-brand-mutedtext">No hosts assigned yet. An admin can assign hosts to you from the Admin panel.</p>}
      <div className="space-y-2">
        {profiles.map((p) => {
          const currentDay = getCurrentDay(p.start_date);
          const week = Math.ceil(currentDay / 7);
          return (
            <Card key={p.id} className="border-brand-line cursor-pointer hover:border-brand-gold" onClick={() => openHost(p)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-brand-text">{p.created_by}</div>
                  <div className="text-xs text-brand-mutedtext">{p.target_market_city} · Day {currentDay} · Week {week}</div>
                </div>
                <Button variant="outline" size="sm" className="border-brand-line text-brand-text">View</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="border-brand-line"><CardContent className="py-3"><div className="text-2xl font-bold text-brand-text">{value}</div><div className="text-xs text-brand-mutedtext">{label}</div></CardContent></Card>
  );
}