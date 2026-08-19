import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dayDate, WEEK_THEMES, WEEK_BLURBS } from "@/lib/curriculum";
import { CheckCircle2, Circle, Lock, SkipForward, ShieldCheck } from "lucide-react";
import BuyBoxSection from "@/components/BuyBoxSection";
import { friendlyError } from "@/lib/friendlyError";
import { useToast } from "@/components/ui/use-toast";
import ObjectionSection from "@/components/ObjectionSection";

export default function Program() {

  const [profile, setProfile] = useState(null);
  const [days, setDays] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skipFor, setSkipFor] = useState(null);
  const [skipReason, setSkipReason] = useState("");
  const [busyTask, setBusyTask] = useState(null);
  const [skipping, setSkipping] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { toast } = useToast();

  const load = async () => {
    try {
      const [p, d, pr] = await Promise.all([
        base44.entities.OnboardingProfile.list("-created_date", 1),
        base44.entities.ProgramDay.list("day", 50),
        base44.entities.UserTaskProgress.list("-created_date", 200)
      ]);
      setProfile(p[0] || null);
      setDays(d.sort((a, b) => a.day - b.day));
      setProgress(pr);
      setLoadError("");
    } catch (e) {
      setLoadError(friendlyError(e, "We couldn't load your program. Refresh the page to try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;
  }

  const start = profile?.start_date;
  const progMap = {};
  progress.forEach((p) => { progMap[`${p.day}-${p.task_index}`] = p; });

  const isComplete = (day, i) => progMap[`${day}-${i}`]?.status === "complete";
  const dayComplete = (d) => (d.tasks || []).every((_, i) => isComplete(d.day, i) || progMap[`${d.day}-${i}`]?.status === "skipped");

  const gateDaysUpTo = (week) => days.filter((d) => d.week < week && d.gate);
  const weekUnlocked = (week) => week === 1 || gateDaysUpTo(week).every((d) => dayComplete(d));

  const toggle = async (day, taskIndex) => {
    const key = `${day}-${taskIndex}`;
    if (busyTask) return;
    const existing = progMap[key];
    const nowComplete = !isComplete(day, taskIndex);
    setBusyTask(key);
    try {
      if (existing) {
        await base44.entities.UserTaskProgress.update(existing.id, {
          status: nowComplete ? "complete" : "pending",
          completed_date: nowComplete ? new Date().toISOString().slice(0, 10) : null
        });
      } else {
        await base44.entities.UserTaskProgress.create({
          day, task_index: taskIndex,
          status: nowComplete ? "complete" : "pending",
          completed_date: nowComplete ? new Date().toISOString().slice(0, 10) : null
        });
      }
      await load();
    } catch (e) {
      // A silently-dropped save on a gate task would let a host believe they
      // had unlocked the next week. Always say so out loud.
      toast({
        title: "That didn't save",
        description: friendlyError(e, "We couldn't record that task. Check your connection and tap it again.")
      });
    } finally {
      setBusyTask(null);
    }
  };

  const doSkip = async () => {
    if (!skipFor || skipping) return;
    const { day, taskIndex } = skipFor;
    const existing = progMap[`${day}-${taskIndex}`];
    const payload = { status: "skipped", skipped_reason: skipReason || "Skipped" };
    setSkipping(true);
    try {
      if (existing) await base44.entities.UserTaskProgress.update(existing.id, payload);
      else await base44.entities.UserTaskProgress.create({ day, task_index: taskIndex, ...payload });
      setSkipFor(null);
      setSkipReason("");
      await load();
    } catch (e) {
      toast({
        title: "That didn't save",
        description: friendlyError(e, "We couldn't log that skip. Check your connection and try again.")
      });
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Your 28-day program</h1>
        <p className="text-brand-mutedtext text-sm">Days unlock sequentially. Gate tasks must be complete before the next week opens.</p>
      </div>

      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {[1, 2, 3, 4].map((w) => <TabsTrigger key={w} value={String(w)}>Week {w}</TabsTrigger>)}
        </TabsList>

        {[1, 2, 3, 4].map((week) => {
          const unlocked = weekUnlocked(week);
          const weekDays = days.filter((d) => d.week === week);
          const tasks = weekDays.reduce((s, d) => s + (d.tasks?.length || 0), 0);
          const done = weekDays.reduce((s, d) => s + (d.tasks || []).filter((_, i) => isComplete(d.day, i)).length, 0);
          return (
            <TabsContent key={week} value={String(week)} className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">{WEEK_THEMES[week]}</h2>
                  <p className="text-sm text-brand-mutedtext">{WEEK_BLURBS[week]}</p>
                </div>
                {unlocked ? <Badge className="bg-green-500/15 text-green-400">{done}/{tasks} done</Badge> : <Badge variant="secondary" className="bg-brand-raised text-brand-mutedtext"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>}
              </div>
              {unlocked && <Progress value={tasks ? (done / tasks) * 100 : 0} className="h-2 [&>div]:bg-brand-gold" />}

              <div className="space-y-3">
                {weekDays.map((d) => (
                  <Card key={d.id} className={`border-brand-line ${d.gate ? "ring-1 ring-brand-gold/40" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-brand-text flex items-center gap-2">
                          <span className="text-brand-mutedtext font-normal">Day {d.day}</span>
                          {d.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {dayDate(start, d.day) && <span className="text-xs text-brand-mutedtext">{dayDate(start, d.day)}</span>}
                          {d.gate && <Badge className="bg-brand-gold text-brand-ink"><ShieldCheck className="w-3 h-3 mr-1" />Gate</Badge>}
                        </div>
                      </div>
                      <p className="text-xs text-brand-mutedtext italic mt-1">{d.why_it_matters}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(d.tasks || []).map((t, i) => {
                        const complete = isComplete(d.day, i);
                        const skipped = progMap[`${d.day}-${i}`]?.status === "skipped";
                        return (
                          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${skipped ? "border-brand-line bg-brand-raised opacity-60" : "border-brand-line"}`}>
                            <button onClick={() => toggle(d.day, i)} disabled={!unlocked} className="mt-0.5">
                              {complete ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-brand-mutedtext" />}
                            </button>
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${complete ? "line-through text-brand-mutedtext" : "text-brand-text"}`}>{t.title}</div>
                              <div className="text-xs text-brand-mutedtext">{t.time_estimate} · {t.completion_condition}</div>
                              {skipped && <div className="text-xs text-amber-400 mt-0.5">Skipped: {progMap[`${d.day}-${i}`]?.skipped_reason}</div>}
                            </div>
                            {!d.gate && !complete && !skipped && unlocked && (
                              <button onClick={() => setSkipFor({ day: d.day, taskIndex: i })} className="text-xs text-brand-mutedtext hover:text-brand-text flex items-center gap-1">
                                <SkipForward className="w-3 h-3" /> Skip
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {d.day === 1 && <BuyBoxSection />}
                      {d.day === 13 && <ObjectionSection />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {skipFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSkipFor(null)}>
          <div className="bg-brand-surface border border-brand-line rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-brand-text mb-2">Skip this task</h3>
            <Label className="text-xs text-brand-mutedtext">Log a reason (required)</Label>
            <Textarea rows={3} value={skipReason} onChange={(e) => setSkipReason(e.target.value)} className="mt-1" placeholder="Why are you skipping?" />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1 border-brand-line text-brand-text" onClick={() => setSkipFor(null)}>Cancel</Button>
              <Button className="flex-1 bg-brand-gold text-brand-ink hover:bg-brand-gold/90" disabled={!skipReason} onClick={doSkip}>Skip & log</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}