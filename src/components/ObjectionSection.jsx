import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Save } from "lucide-react";

const OBJECTIONS = [
  { key: "subletting", text: "I don't allow subletting", answer: "This is a corporate lease with a written addendum, not a sublet-and-disappear. I am the tenant of record, I carry the insurance, and the permission is in writing so it survives a change in property management." },
  { key: "trashing", text: "What if you trash my place?", answer: "My entire business runs on 5-star reviews, so I have more incentive than any tenant to keep this property in top condition. 25-and-over guest age policy, noise monitoring, professional cleaning between every single stay, and my own STR liability insurance." },
  { key: "cant_pay", text: "What if you can't pay?", answer: "Your rent is my fixed liability. I pay it whether the unit is booked or empty. That is the whole point — you get a predictable monthly payment and I absorb the occupancy risk." },
  { key: "never_heard", text: "I've never heard of this", answer: "It's called rental arbitrage. I lease your property at a guaranteed monthly rate and rent it furnished to corporate tenants and traveling professionals. You get passive income with zero management. Here's a one-page summary." },
  { key: "insurance", text: "My insurance won't cover it", answer: "It doesn't have to. I carry commercial STR liability insurance on top of renter's insurance, and I'll name you as an additional insured so you have documentation." },
  { key: "flat_no", text: "A flat 'no' from a property management company", answer: "\"Can you give me 30 seconds to explain why?\" Then lead with guaranteed rent and asset protection. Never say \"Airbnb\" or \"corporate leasing\" — those trigger automatic rejection." }
];

export default function ObjectionSection({ coachId }) {
  const [existing, setExisting] = useState({});
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.ObjectionResponse.list("-created_date", 50);
      const map = {};
      list.forEach((r) => { map[r.objection_key] = r; });
      setExisting(map);
      const filled = {};
      OBJECTIONS.forEach((o) => { filled[o.key] = map[o.key]?.host_response || ""; });
      setResponses(filled);
    })();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(OBJECTIONS.map((o) => {
      const payload = { objection_key: o.key, objection_text: o.text, annette_answer: o.answer, host_response: responses[o.key] || "", coach_id: coachId };
      const rec = existing[o.key];
      if (rec) return base44.entities.ObjectionResponse.update(rec.id, payload);
      return base44.entities.ObjectionResponse.create(payload);
    }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-3 border-t border-brand-line pt-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand-gold" /><h4 className="font-semibold text-brand-text text-sm">Objection handler</h4></div>
        <Button size="sm" className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={saveAll} disabled={saving}><Save className="w-3 h-3 mr-1" /> {saved ? "Saved" : saving ? "Saving…" : "Save all"}</Button>
      </div>
      <p className="text-xs text-brand-mutedtext mb-3">The landlord says no in five predictable ways. Read Annette's answer, then write your own version in your voice.</p>
      <div className="space-y-3">
        {OBJECTIONS.map((o) => (
          <div key={o.key} className="border border-brand-line rounded-lg p-3 bg-brand-raised">
            <div className="text-sm font-medium text-brand-text">"{o.text}"</div>
            <div className="text-xs text-brand-mutedtext mt-1 border-l-2 border-brand-gold pl-2"><span className="font-semibold text-brand-gold">Annette:</span> {o.answer}</div>
            <Textarea rows={2} className="mt-2 text-sm" placeholder="Your version…" value={responses[o.key] || ""} onChange={(e) => setResponses((r) => ({ ...r, [o.key]: e.target.value }))} />
          </div>
        ))}
      </div>
    </div>
  );
}