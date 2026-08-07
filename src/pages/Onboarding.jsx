import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Stethoscope, ArrowRight } from "lucide-react";

const CONSTRAINTS = ["Time", "Capital", "Market knowledge", "Landlord access", "Confidence"];

export default function Onboarding() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    portfolio_size: "0",
    target_market_city: "",
    capital_available: "",
    hours_per_week: "10",
    biggest_constraint: "Time",
    goal_28_day: "Sign my first arbitrage lease",
    weekly_outreach_target: "20"
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.OnboardingProfile.create({
        ...form,
        portfolio_size: Number(form.portfolio_size) || 0,
        capital_available: Number(form.capital_available) || 0,
        hours_per_week: Number(form.hours_per_week) || 0,
        weekly_outreach_target: Number(form.weekly_outreach_target) || 20,
        start_date: today
      });
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand">Welcome to your 28-day sprint</h1>
          <p className="text-slate-500 text-sm">Let's build your personalized plan.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-brand">Onboarding intake</CardTitle>
          <CardDescription>
            Your answers generate a personalized 28-day calendar with real dates and a weekly outreach target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
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
            <Button type="submit" disabled={saving} className="w-full h-12 bg-brand hover:bg-brand-bright">
              {saving ? "Building your plan…" : "Generate my 28-day calendar"}
              {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}