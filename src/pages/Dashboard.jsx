import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ProgressRing from "@/components/ProgressRing";
import { getCurrentDay, daysRemaining, dayDate, WEEK_THEMES } from "@/lib/curriculum";
import { Users, MessageSquare, Calculator, Handshake, CheckCircle2, Clock, ArrowRight, LifeBuoy, Download, Trophy } from "lucide-react";
import { downloadAll } from "@/lib/exportData";
import { logAudit } from "@/lib/audit";
import { useToast } from "@/components/ui/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import WeeklyCallCard from "@/components/WeeklyCallCard";
import { CALL_BOOKING_URL } from "@/lib/programConfig";

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [days, setDays] = useState([]);
  const [progress, setProgress] = useState([]);
  const [deals, setDeals] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const total = await downloadAll();
      await logAudit("data_export", `all datasets (${total} records)`);
      toast({ title: "Export ready", description: `${total} record${total === 1 ? "" : "s"} exported.` });
    } catch (e) {
      toast({ title: "Export failed", description: friendlyError(e, "We couldn't build your download. Try again in a moment.") });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, d, pr, de, ll] = await Promise.all([
          base44.entities.OnboardingProfile.list("-created_date", 1),
          base44.entities.ProgramDay.list("day", 50),
          base44.entities.UserTaskProgress.list("-created_date", 200),
          base44.entities.Deal.list("-created_date", 50),
          base44.entities.Landlord.list("-created_date", 200)
        ]);
        setProfile(p[0] || null);
        setDays(d.sort((a, b) => a.day - b.day));
        setProgress(pr);
        setDeals(de);
        setLandlords(ll);
      } catch (e) {
        setLoadError(friendlyError(e, "We couldn't load your dashboard. Refresh the page to try again."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  const start = profile?.start_date;
  const currentDay = getCurrentDay(start);
  const remaining = daysRemaining(start);
  const progMap = {};
  progress.forEach((p) => { progMap[`${p.day}-${p.task_index}`] = p; });

  const totalTasks = days.reduce((s, d) => s + (d.tasks?.length || 0), 0) || 28;
  const completedTasks = progress.filter((p) => p.status === "complete").length;
  const programPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weekNum = Math.ceil(currentDay / 7);
  const weekDays = days.filter((d) => d.week === weekNum);
  const weekTasks = weekDays.reduce((s, d) => s + (d.tasks?.length || 0), 0) || 7;
  const weekDone = weekDays.reduce((s, d) => s + (d.tasks || []).filter((_, i) => progMap[`${d.day}-${i}`]?.status === "complete").length, 0);
  const weekPct = weekTasks ? Math.round((weekDone / weekTasks) * 100) : 0;

  const todayDay = days.find((d) => d.day === currentDay);
  const todayTasks = todayDay?.tasks || [];

  const landlordsContacted = landlords.filter((l) => l.stage !== "not contacted").length;
  const conversations = landlords.filter((l) => ["conversation held", "property viewed", "negotiating", "won"].includes(l.stage)).length;
  const dealsUnderwritten = deals.length;
  const dealsNegotiating = deals.filter((d) => d.status === "negotiating").length;

  const expectedPace = Math.round((currentDay / 28) * totalTasks);
  const behind = completedTasks < expectedPace - 2;

  const nextBest = todayTasks.some((_, i) => !progMap[`${currentDay}-${i}`] || progMap[`${currentDay}-${i}`].status === "pending")
    ? `Finish today's tasks (Day ${currentDay})`
    : dealsNegotiating > 0
    ? "Push your active negotiation forward today"
    : landlordsContacted < 100
    ? "Keep the outreach queue moving"
    : "Underwrite your next deal";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">
            {profile?.target_market_city ? `Hello — let's win ${profile.target_market_city}` : "Your dashboard"}
          </h1>
          <p className="text-brand-mutedtext text-sm">Day {currentDay} of 28 · {remaining} days remaining · Week {weekNum}: {WEEK_THEMES[weekNum]}</p>
        </div>
        <Link to="/program"><Button variant="outline" className="border-brand-line text-brand-text">Open program <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
      </div>

      {loadError && (
        <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-300">{loadError}</div>
      )}

      {!loadError && days.length === 0 && (
        <Card className="border-brand-gold/40 bg-brand-gold/5">
          <CardContent className="py-6 text-center space-y-2">
            <h2 className="text-base font-semibold text-brand-text">Your program is being set up</h2>
            <p className="text-sm text-brand-mutedtext max-w-md mx-auto">
              Your 28-day plan hasn't loaded yet. Nothing is wrong on your end — reach out to your coach and we'll get
              it switched on. Your analyzers and pipeline work in the meantime.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-brand-line">
          <CardContent className="flex items-center gap-4 py-5">
            <ProgressRing value={programPct} />
            <div>
              <div className="text-sm text-brand-mutedtext">Program progress</div>
              <div className="text-2xl font-bold text-brand-text">{completedTasks}/{totalTasks}</div>
              <div className="text-xs text-brand-mutedtext">tasks complete</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-line sm:col-span-2">
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-brand-text">Week {weekNum} progress</div>
              <div className="text-sm text-brand-mutedtext">{weekDone}/{weekTasks}</div>
            </div>
            <Progress value={weekPct} className="h-3 [&>div]:bg-brand-gold" />
            <div className="text-xs text-brand-mutedtext mt-2">{WEEK_THEMES[weekNum]}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Users} value={landlordsContacted} goal="100" label="Landlords contacted" />
        <Metric icon={MessageSquare} value={conversations} goal="10-15" label="Conversations this week" />
        <Metric icon={Calculator} value={dealsUnderwritten} goal="8-10" label="Deals underwritten" />
        <Metric icon={Handshake} value={dealsNegotiating} goal="—" label="Deals in negotiation" />
        <Button
          onClick={handleExport}
          disabled={exporting}
          className="col-span-2 lg:col-span-4 bg-brand-gold text-brand-ink hover:bg-brand-gold/90 h-11"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-brand-line">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-brand-text text-lg">Today's focus</CardTitle>
              {todayDay?.gate && <Badge className="bg-brand-gold text-brand-ink">Gate day</Badge>}
            </div>
            {todayDay && <p className="text-xs text-brand-mutedtext">{dayDate(start, currentDay)} · {todayDay.title}</p>}
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 && <p className="text-sm text-brand-mutedtext py-4">All caught up — nice work today.</p>}
            {todayTasks.map((t, i) => {
              const st = progMap[`${currentDay}-${i}`]?.status;
              return (
                <Link key={i} to="/program" className="flex items-start gap-3 p-3 rounded-lg hover:bg-brand-raised border border-brand-line">
                  {st === "complete" ? <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" /> : <Clock className="w-5 h-5 text-brand-mutedtext mt-0.5" />}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${st === "complete" ? "line-through text-brand-mutedtext" : "text-brand-text"}`}>{t.title}</div>
                    <div className="text-xs text-brand-mutedtext">{t.time_estimate} · {t.completion_condition}</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-brand-gold/40 bg-brand-gold/10">
            <CardContent className="py-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="w-4 h-4 text-brand-gold" />
                <div className="text-xs uppercase tracking-wide text-brand-gold font-semibold">Next best action</div>
              </div>
              <div className="text-sm font-medium text-brand-text">{nextBest}</div>
            </CardContent>
          </Card>

          <WeeklyCallCard week={weekNum} bookingUrl={CALL_BOOKING_URL} />

          {currentDay >= 21 && (
            <Card className="border-brand-line">
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-brand-gold" />
                  <div className="text-sm font-semibold text-brand-text">Your 28-day results</div>
                </div>
                <p className="text-xs text-brand-mutedtext mb-3">
                  See what your funnel actually produced — and what it says to do next.
                </p>
                <Link to="/graduation">
                  <Button className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90 h-9 text-sm">
                    Open my results
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {behind && (
            <Card className="border-brand-line">
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <LifeBuoy className="w-4 h-4 text-brand-gold" />
                  <div className="text-sm font-semibold text-brand-text">Recalibrate</div>
                </div>
                <p className="text-xs text-brand-mutedtext mb-3">You're a touch behind pace. That's okay — here are warm options:</p>
                <div className="space-y-2 text-xs">
                  <Link to="/program" className="block w-full text-left p-2 rounded border border-brand-line hover:bg-brand-raised text-brand-text">Drop a non-gate task</Link>
                  <Link to="/resources" className="block w-full text-left p-2 rounded border border-brand-line hover:bg-brand-raised text-brand-text">Get unstuck with a resource</Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, goal, label }) {
  return (
    <Card className="border-brand-line">
      <CardContent className="py-4">
        <Icon className="w-5 h-5 text-brand-gold mb-2" />
        <div className="text-2xl font-bold text-brand-text">{value}</div>
        <div className="text-xs text-brand-mutedtext">goal {goal}</div>
        <div className="text-xs text-brand-mutedtext mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}