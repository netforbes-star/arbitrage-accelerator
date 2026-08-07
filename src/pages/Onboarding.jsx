import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, ArrowRight, ShieldCheck } from "lucide-react";
import { TERMS_VERSION, ACKNOWLEDGEMENTS } from "@/lib/legal";
import { logAudit } from "@/lib/audit";

const CONSTRAINTS = ["Time", "Capital", "Market knowledge", "Landlord access", "Confidence"];

export default function Onboarding({ existingProfile }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(existingProfile ? "reality" : "intake");
  const [form, setForm] = useState({
    portfolio_size: "0",
    target_market_city: "",
    capital_available: "",
    hours_per_week: "10",
    biggest_constraint: "Time",
    goal_28_day: "Sign my first arbitrage lease",
    weekly_outreach_target: "20"
  });
  const [checks, setChecks] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const allChecked = ACKNOWLEDGEMENTS.every((a) => checks[a.key]);

  const termsFields = () => ({
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
    acknowledgements_accepted: ACKNOWLEDGEMENTS.map((a) => a.key)
  });

  const submitReality = async () => {
    setError("");
    setSaving(true);
    try {
      if (existingProfile) {
        await base44.entities.OnboardingProfile.update(existingProfile.id, termsFields());
      } else {
        await base44.entities.OnboardingProfile.create({
          ...form,
          portfolio_size: Number(form.portfolio_size) || 0,
          capital_available: Number(form.capital_available) || 0,
          hours_per_week: Number(form.hours_per_week) || 0,
          weekly_outreach_target: Number(form.weekly_outreach_target) || 20,
          start_date: today,
          ...termsFields()
        });
      }
      await logAudit("terms_accepted", `version ${TERMS_VERSION}`);
      navigate("/");
    } catch (e) {
      console.error("Onboarding save failed", e);
      setError("We couldn't save this yet. Your information is still on this screen — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-brand-gold flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-brand-ink" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-text">
            {existingProfile ? "One quick thing before you continue" : "Welcome to your 28-day sprint"}
          </h1>
          <p className="text-brand-mutedtext text-sm">
            {existingProfile ? "We updated our terms — please re-confirm below." : "Let's build your personalized plan."}
          </p>
        </div>
      </div>

      {step === "intake" && (
        <Card className="border-brand-line">
          <CardHeader>
            <CardTitle className="text-brand-text">Onboarding intake</CardTitle>
            <CardDescription>
              Your answers generate a personalized 28-day calendar with real dates and a weekly outreach target.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); setStep("reality"); }}
              className="space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Properties in your portfolio">
                  <Input type="number" min="0" value={form.portfolio_size} onChange={(e) => set("portfolio_size", e.target.value)} />
                </Field>
                <Field label="Target market city">
                  <Input required placeholder="e.g. Nashville, TN" value={form.target_market_city} onChange={(e) => set("target_market_city", e.target.value)} />
                </Field>
                <Field label="Capital available ($)">
                  <Input type="number" min="0" placeholder="e.g. 15000" value={form.capital_available} onChange={(e) => set("capital_available", e.target.value)} />
                </Field>
                <Field label="Hours per week">
                  <Input type="number" min="0" value={form.hours_per_week} onChange={(e) => set("hours_per_week", e.target.value)} />
                </Field>
                <Field label="Biggest constraint">
                  <Select value={form.biggest_constraint} onValueChange={(v) => set("biggest_constraint", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONSTRAINTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Weekly outreach target">
                  <Input type="number" min="1" value={form.weekly_outreach_target} onChange={(e) => set("weekly_outreach_target", e.target.value)} />
                </Field>
              </div>
              <Field label="Your 28-day goal">
                <Textarea rows={2} value={form.goal_28_day} onChange={(e) => set("goal_28_day", e.target.value)} />
              </Field>
              <Button type="submit" className="w-full h-12 bg-brand-gold text-brand-ink hover:bg-brand-gold/90">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "reality" && (
        <Card className="border-brand-line">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-gold" />
              <CardTitle className="text-brand-text">The Arbitrage Reality Check</CardTitle>
            </div>
            <CardDescription>
              Straight talk from Annette before we start. This isn't a legal wall — it's the honest version of what you're
              signing up for. Tick each one so we both know you're walking in with eyes open.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ACKNOWLEDGEMENTS.map((a) => (
              <label key={a.key} className="flex items-start gap-3 p-3 rounded-lg border border-brand-line bg-brand-raised cursor-pointer hover:bg-brand-raised/80">
                <Checkbox
                  checked={!!checks[a.key]}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, [a.key]: !!v }))}
                  className="mt-0.5"
                />
                <span className="text-sm text-brand-text leading-relaxed">{a.text}</span>
              </label>
            ))}
            <div className="pt-1">
              <Link to="/terms" target="_blank" rel="noreferrer" className="text-brand-gold hover:underline text-sm">
                Read the full Terms &amp; Privacy →
              </Link>
            </div>
            <Button
              onClick={submitReality}
              disabled={!allChecked || saving}
              className="w-full h-12 bg-brand-gold text-brand-ink hover:bg-brand-gold/90"
            >
              {saving ? "Saving…" : existingProfile ? "I confirm — take me to my dashboard" : "Accept & generate my 28-day calendar"}
              {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            {!allChecked && <p className="text-xs text-brand-mutedtext text-center">Every box needs a tick to continue.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-brand-text">{label}</Label>
      {children}
    </div>
  );
}