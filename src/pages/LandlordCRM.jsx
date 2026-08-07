import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Users, Plus, Phone, Mail, Send, List, LayoutGrid, X } from "lucide-react";

const STAGES = ["not contacted", "contacted", "responded", "conversation held", "property viewed", "negotiating", "won", "lost", "nurture"];
const CHANNELS = ["email", "phone", "text", "in-person", "direct mail", "social"];

export default function LandlordCRM() {
  const { coachId } = useHostProfile();
  const [landlords, setLandlords] = useState([]);
  const [view, setView] = useState("list");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [logFor, setLogFor] = useState(null);
  const [form, setForm] = useState({ name: "", company: "", type: "private", stage: "not contacted", email: "", phone: "", notes: "", next_action_date: "" });
  const [log, setLog] = useState({ channel: "email", template: "", outcome: "" });

  const load = async () => {
    const [ll] = await Promise.all([
      base44.entities.Landlord.list("-created_date", 300)
    ]);
    setLandlords(ll);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addLandlord = async () => {
    if (!form.name) return;
    await base44.entities.Landlord.create({ ...form, coach_id: coachId });
    setForm({ name: "", company: "", type: "private", stage: "not contacted", email: "", phone: "", notes: "", next_action_date: "" });
    setShowAdd(false);
    load();
  };

  const moveStage = async (id, stage) => {
    await base44.entities.Landlord.update(id, { stage, last_contact_date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const saveLog = async () => {
    const ll = landlords.find((l) => l.id === logFor);
    await base44.entities.OutreachLog.create({
      landlord_id: logFor, landlord_name: ll?.name || "", channel: log.channel, template: log.template, outcome: log.outcome,
      date: new Date().toISOString().slice(0, 10), coach_id: coachId
    });
    if (ll && ll.stage === "not contacted") await base44.entities.Landlord.update(logFor, { stage: "contacted", last_contact_date: new Date().toISOString().slice(0, 10) });
    setLogFor(null);
    setLog({ channel: "email", template: "", outcome: "" });
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;

  const today = new Date().toISOString().slice(0, 10);
  const sendQueue = landlords.filter((l) => l.stage !== "won" && l.stage !== "lost" && (!l.next_action_date || l.next_action_date <= today));
  const contacted = landlords.filter((l) => l.stage !== "not contacted").length;
  const conversations = landlords.filter((l) => ["conversation held", "property viewed", "negotiating", "won"].includes(l.stage)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2"><Users className="w-6 h-6 text-brand-gold" /> Landlord CRM</h1>
          <p className="text-brand-mutedtext text-sm">{contacted} contacted · {conversations} conversations this week (goal 10-15) · {landlords.length} total</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-brand-line p-0.5 bg-brand-raised">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${view === "list" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext"}`}><List className="w-4 h-4" /> List</button>
            <button onClick={() => setView("kanban")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${view === "kanban" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext"}`}><LayoutGrid className="w-4 h-4" /> Board</button>
          </div>
          <Button className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      <Card className="border-brand-gold/40 bg-brand-gold/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-2"><Send className="w-4 h-4 text-brand-gold" /><span className="text-sm font-semibold text-brand-text">Daily send queue</span></div>
          {sendQueue.length === 0 ? <p className="text-sm text-brand-mutedtext">You're all caught up on follow-ups. Add new landlords to keep the pipeline warm.</p> : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sendQueue.slice(0, 10).map((l) => (
                <button key={l.id} onClick={() => setLogFor(l.id)} className="shrink-0 bg-brand-surface border border-brand-line rounded-lg px-3 py-2 text-left hover:border-brand-gold">
                  <div className="text-sm font-medium text-brand-text">{l.name}</div>
                  <div className="text-xs text-brand-mutedtext">{l.stage}{l.next_action_date ? ` · due ${l.next_action_date}` : ""}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {view === "list" ? (
        <div className="space-y-2">
          {landlords.length === 0 && <p className="text-sm text-brand-mutedtext">No landlords yet. Add your first contact to start the pipeline.</p>}
          {landlords.map((l) => (
            <Card key={l.id} className="border-brand-line">
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-brand-text truncate">{l.name}</span>
                    {l.company && <span className="text-xs text-brand-mutedtext">{l.company}</span>}
                    <Badge variant="outline" className="text-xs border-brand-line text-brand-mutedtext">{l.type === "pm" ? "PM Co" : "Private"}</Badge>
                  </div>
                  <div className="text-xs text-brand-mutedtext">{l.email} {l.phone && `· ${l.phone}`}</div>
                </div>
                <Select value={l.stage} onValueChange={(v) => moveStage(l.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="border-brand-line text-brand-text" onClick={() => setLogFor(l.id)}><Mail className="w-4 h-4 mr-1" /> Log touch</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const items = landlords.filter((l) => l.stage === stage);
            return (
              <div key={stage} className="shrink-0 w-60">
                <div className="text-xs font-semibold text-brand-mutedtext uppercase mb-2">{stage} ({items.length})</div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <Card key={l.id} className="border-brand-line cursor-pointer hover:border-brand-gold" onClick={() => setLogFor(l.id)}>
                      <CardContent className="py-2.5">
                        <div className="text-sm font-medium text-brand-text">{l.name}</div>
                        <div className="text-xs text-brand-mutedtext">{l.type === "pm" ? "PM Co" : "Private"}{l.company ? ` · ${l.company}` : ""}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAdd || logFor) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => { setShowAdd(false); setLogFor(null); }}>
          <div className="bg-brand-surface border border-brand-line rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {showAdd ? (
              <>
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-brand-text">Add landlord</h3><button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-brand-mutedtext" /></button></div>
                <div className="space-y-3">
                  <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Company"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
                    <Field label="Type"><Select value={form.type} onValueChange={(v) => set("type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="pm">PM Co</SelectItem></SelectContent></Select></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                    <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                  </div>
                  <Field label="Next action date"><Input type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} /></Field>
                  <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
                  <Button className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={addLandlord}>Add landlord</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-brand-text">Log outreach touch</h3><button onClick={() => setLogFor(null)}><X className="w-4 h-4 text-brand-mutedtext" /></button></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Channel"><Select value={log.channel} onValueChange={(v) => setLog((l) => ({ ...l, channel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Template used"><Input value={log.template} onChange={(e) => setLog((l) => ({ ...l, template: e.target.value }))} placeholder="e.g. Initial email" /></Field>
                  </div>
                  <Field label="Outcome"><Textarea rows={3} value={log.outcome} onChange={(e) => setLog((l) => ({ ...l, outcome: e.target.value }))} placeholder="What happened?" /></Field>
                  <Button className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={saveLog}><Phone className="w-4 h-4 mr-1" /> Log touch</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs font-medium text-brand-text">{label}</Label>{children}</div>;
}