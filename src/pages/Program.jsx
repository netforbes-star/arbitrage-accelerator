import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dayDate, WEEK_THEMES, WEEK_BLURBS } from "@/lib/curriculum";
import { CheckCircle2, Circle, Lock, SkipForward, ShieldCheck } from "lucide-react";

export default function Program() {
  const { coachId } = useHostProfile();
  const [profile, setProfile] = useState(null);
  const [days, setDays] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skipFor, setSkipFor] = useState(null);
  const [skipReason, setSkipReason] = useState("");

  const load = async () => {
    const [p, d, pr] = await Promise.all([
      base44.entities.OnboardingProfile.list("-created_date", 1),
      base44.entities.ProgramDay.list("day", 50),
      base44.entities.UserTaskProgress.list("-created_date", 200)
    ]);
    setProfile(p[0] || null);
    setDays(d.sort((a, b) => a.day - b.day));
    setProgress(pr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>;
  }

  const start = profile?.start_date;
  const progMap = {};
  progress.forEach((p) => { progMap[`${p.day}-${p.task_index}`] = p; });

  const isComplete = (day, i) => progMap[`${day}-${i}`]?.status === "complete";
  const dayComplete = (d) => (d.tasks || []).every((_, i) => isComplete(d.day, i) || progMap[`${d.day}-${i}`]?.status === "skipped");

  const gateDaysUpTo = (week) => days.filter((d) => d.week < week && d.gate);
  const weekUnlocked = (week) => week === 1 || gateDaysUpTo(week).every((d) => dayComplete(d));

  const toggle = async (day, taskIndex, dayId) => {
    const existing = progMap[`${day}-${taskIndex}`];
    const nowComplete = !isComplete(day, taskIndex);
    if (existing) {
      await base44.entities.UserTaskProgress.update(existing.id, {
        status: nowComplete ? "complete" : "pending",
        completed_date: nowComplete ? new Date().toISOString().slice(0, 10) : null
      });
    } else {
      await base44.entities.UserTaskProgress.create({
        day, task_index: taskIndex, coach_id: coachId,
        status: nowComplete ? "complete" : "pending",
        completed_date: nowComplete ? new Date().toISOString().slice(0, 10) : null
      });
    }
    load();
  };

  const doSkip = async () => {
    if (!skipFor) return;
    const { day, taskIndex } = skipFor;
    const existing = progMap[`${day}-${taskIndex}`];
    const payload = { status: "skipped", skipped_reason: skipReason || "Skipped", coach_id: coachId };
    if (existing) await base44.entities.UserTaskProgress.update(existing.id, payload);
    else await base44.entities.UserTaskProgress.create({ day, task_index: taskIndex, ...payload });
    setSkipFor(null); setSkipReason("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Your 28-day program</h1>
        <p className="text-slate-500 text-sm">Days unlock sequentially. Gate tasks must be complete before the next week opens.</p>
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
                  <h2 className="text-lg font-semibold text-brand">{WEEK_THEMES[week]}</h2>
                  <p className="text-sm text-slate-500">{WEEK_BLURBS[week]}</p>
                </div>
                {unlocked ? <Badge className="bg-green-100 text-green-700">{done}/{tasks} done</Badge> : <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>}
              </div>
              {unlocked && <Progress value={tasks ? (done / tasks) * 100 : 0} className="h-2 [&>div]:bg-brand" />}

              <div className="space-y-3">
                {weekDays.map((d) => (
                  <Card key={d.id} className={`border-slate-200 ${d.gate ? "ring-1 ring-brand-gold/40" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-brand flex items-center gap-2">
                          <span className="text-slate-400 font-normal">Day {d.day}</span>
                          {d.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {dayDate(start, d.day) && <span className="text-xs text-slate-400">{dayDate(start, d.day)}</span>}
                          {d.gate && <Badge className="bg-brand-gold text-white"><ShieldCheck className="w-3 h-3 mr-1" />Gate</Badge>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 italic mt-1">{d.why_it_matters}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(d.tasks || []).map((t, i) => {
                        const complete = isComplete(d.day, i);
                        const skipped = progMap[`${d.day}-${i}`]?.status === "skipped";
                        return (
                          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${skipped ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-100"}`}>
                            <button onClick={() => toggle(d.day, i)} disabled={!unlocked} className="mt-0.5">
                              {complete ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-slate-300" />}
                            </button>
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${complete ? "line-through text-slate-400" : "text-slate-800"}`}>{t.title}</div>
                              <div className="text-xs text-slate-400">{t.time_estimate} · {t.completion_condition}</div>
                              {skipped && <div className="text-xs text-amber-600 mt-0.5">Skipped: {progMap[`${d.day}-${i}`]?.skipped_reason}</div>}
                            </div>
                            {!d.gate && !complete && !skipped && unlocked && (
                              <button onClick={() => setSkipFor({ day: d.day, taskIndex: i })} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                <SkipForward className="w-3 h-3" /> Skip
                              </button>
                            )}
                          </div>
                        );
                      })}
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
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-brand mb-2">Skip this task</h3>
            <Label className="text-xs text-slate-500">Log a reason (required)</Label>
            <Textarea rows={3} value={skipReason} onChange={(e) => setSkipReason(e.target.value)} className="mt-1" placeholder="Why are you skipping?" />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={() => setSkipFor(null)}>Cancel</Button>
              <Button className="flex-1 bg-brand" disabled={!skipReason} onClick={doSkip}>Skip & log</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}