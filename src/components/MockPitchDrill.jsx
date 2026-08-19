import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Play, RotateCcw, CheckCircle2, Timer, AlertTriangle } from "lucide-react";

/**
 * Mock Pitch Drill — rehearsal, out loud, against a pushback-heavy landlord.
 *
 * Writing an objection answer and saying it to a skeptical human are different
 * skills. Hosts who have not rented as a tenant in years are strongest on the
 * numbers and weakest on the cold open, so this drills delivery under time
 * pressure rather than testing knowledge.
 *
 * Deliberately local-only: no recording is uploaded, no audio is stored, no
 * entity is written. It is a timer and a script prompter. That keeps a
 * rehearsal tool from quietly becoming a new place host data can leak from.
 */

const ROUNDS = [
  {
    id: "open",
    label: "The cold open",
    seconds: 30,
    prompt: "You have 30 seconds before they decide whether to keep listening. Introduce yourself, say what you want, and give them one reason to stay on the line.",
    landlord: "\"Hello?\" — distracted, mid-task, no idea who you are.",
    watchFor: [
      "Do not say \"Airbnb\" or \"corporate leasing\" — both trigger an automatic no",
      "Lead with guaranteed rent, not with what you want",
      "Ask for a small, specific next step — 15 minutes, not a decision"
    ]
  },
  {
    id: "sublet",
    label: "\"I don't allow subletting\"",
    seconds: 60,
    prompt: "The most common hard no. Reframe from sublet to corporate lease with a written addendum — and make them feel safer after you speak than before.",
    landlord: "\"Look, my lease says no subletting. That's the end of it.\"",
    watchFor: [
      "Name yourself as tenant of record — you are not disappearing",
      "Written addendum, so it survives a management change",
      "You carry the insurance, not them"
    ]
  },
  {
    id: "trash",
    label: "\"What if you trash my place?\"",
    seconds: 60,
    prompt: "This is fear, not a question. Answer the fear first, then the specifics.",
    landlord: "\"I've heard horror stories. Parties, damage, neighbours calling me.\"",
    watchFor: [
      "Your business runs on reviews — you are the most motivated party",
      "25+ age policy, noise monitoring, professional cleaning every stay",
      "Offer the $200 repair threshold before they ask"
    ]
  },
  {
    id: "repairs",
    label: "The repair-response ask",
    seconds: 60,
    prompt: "You need a written repair-response window. A slow landlord costs you paying guests, and you have felt what a month of lost income does.",
    landlord: "\"I get to things when I get to them. I'm not on call for you.\"",
    watchFor: [
      "Ask for a specific response window in writing, not a promise",
      "Offer to handle anything under $200 yourself — that is the trade",
      "Frame it as protecting their asset, because fast fixes prevent big damage"
    ]
  },
  {
    id: "flat_no",
    label: "The flat no",
    seconds: 30,
    prompt: "A property manager says no before you finish. Ask for 30 seconds — and actually use only 30.",
    landlord: "\"No. We don't do that here.\" — already reaching to hang up.",
    watchFor: [
      "\"Can you give me 30 seconds to explain why?\" — then stop talking",
      "Guaranteed rent and asset protection, nothing else",
      "Leave the door open: ask what would have to be true"
    ]
  }
];

export default function MockPitchDrill() {
  const [active, setActive] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState({});
  const tick = useRef(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick.current);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running]);

  useEffect(() => () => clearInterval(tick.current), []);

  const start = (round) => {
    clearInterval(tick.current);
    setActive(round);
    setRemaining(round.seconds);
    setRunning(true);
  };

  const reset = () => {
    clearInterval(tick.current);
    setRunning(false);
    setRemaining(active ? active.seconds : 0);
  };

  const markDone = () => {
    if (!active) return;
    clearInterval(tick.current);
    setRunning(false);
    setDone((d) => ({ ...d, [active.id]: true }));
  };

  const completed = Object.keys(done).length;
  const mmss = `${String(Math.floor(remaining / 60)).padStart(1, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="mt-4 pt-4 border-t border-brand-line space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-brand-gold" />
          <h3 className="text-sm font-semibold text-brand-text">Mock pitch drill</h3>
        </div>
        <span className="text-xs text-brand-mutedtext">{completed}/{ROUNDS.length} rehearsed</span>
      </div>

      <p className="text-xs text-brand-mutedtext">
        Say your answer out loud, on the clock, before you say it to a real landlord. Writing an answer and delivering
        one are different skills — this drills the second. Nothing is recorded or uploaded.
      </p>

      <div className="grid sm:grid-cols-2 gap-2">
        {ROUNDS.map((r) => (
          <button
            key={r.id}
            onClick={() => start(r)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              active?.id === r.id ? "border-brand-gold bg-brand-gold/10" : "border-brand-line hover:bg-brand-raised"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-brand-text">{r.label}</span>
              {done[r.id] && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
            </div>
            <span className="text-xs text-brand-mutedtext flex items-center gap-1 mt-0.5">
              <Timer className="w-3 h-3" /> {r.seconds}s
            </span>
          </button>
        ))}
      </div>

      {active && (
        <Card className="border-brand-gold/40 bg-brand-gold/5">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-text">{active.label}</span>
              <span className={`text-2xl font-bold tabular-nums ${remaining === 0 ? "text-red-400" : "text-brand-gold"}`}>
                {mmss}
              </span>
            </div>

            <p className="text-xs text-brand-mutedtext">{active.prompt}</p>

            <div className="p-3 rounded-lg bg-brand-raised border border-brand-line">
              <div className="text-[10px] uppercase tracking-wide text-brand-mutedtext mb-1">They say</div>
              <p className="text-sm text-brand-text italic">{active.landlord}</p>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-brand-mutedtext mb-1">Land these</div>
              <ul className="space-y-1">
                {active.watchFor.map((w, i) => (
                  <li key={i} className="text-xs text-brand-mutedtext flex items-start gap-2">
                    <span className="text-brand-gold mt-0.5">·</span>{w}
                  </li>
                ))}
              </ul>
            </div>

            {remaining === 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Time's up. If you ran long, cut the setup — landlords decide in the first two sentences.
              </div>
            )}

            <div className="flex gap-2">
              {!running && remaining > 0 && (
                <Button size="sm" onClick={() => setRunning(true)} className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90">
                  <Play className="w-3.5 h-3.5 mr-1" /> Start
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={reset} className="border-brand-line text-brand-text">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
              <Button size="sm" variant="outline" onClick={markDone} className="border-brand-line text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> I rehearsed this
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {completed === ROUNDS.length && (
        <div className="p-3 rounded-lg border border-green-500/40 bg-green-500/10 text-xs text-green-300">
          All five rehearsed. Book the call before the confidence fades — practised today, dialled tomorrow.
        </div>
      )}
    </div>
  );
}
