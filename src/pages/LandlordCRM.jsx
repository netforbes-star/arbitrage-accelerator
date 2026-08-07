import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { crmMetrics } from "@/functions/crmMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Users, Plus, Phone, Mail, Send, List, LayoutGrid, X, ChevronDown } from "lucide-react";
import LandlordKanban from "@/components/LandlordKanban";

const STAGES = ["not contacted", "contacted", "responded", "conversation held", "property viewed", "negotiating", "won", "lost", "nurture"];
const ACTIVE_STAGES = ["not contacted", "contacted", "responded", "conversation held", "property viewed", "negotiating", "nurture"];
const CHANNELS = ["email", "phone", "text", "in-person", "direct mail", "social"];
const PAGE_SIZE = 50;
const QUEUE_LIMIT = 100;

export default function LandlordCRM() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  // Daily action queue: only the active pipeline (excludes won/lost history),
  // sorted by next action date — today's work without loading the full CRM.
  const queueQuery = useQuery({
    queryKey: ["landlords", "queue"],
    queryFn: () => base44.entities.Landlord.filter({ stage: { $in: ACTIVE_STAGES } }, "next_action_date", QUEUE_LIMIT)
  });
  const queue = queueQuery.data || [];

  // Aggregate metrics: counts computed server-side so the browser never loads
  // the historical landlord list just to total the pipeline.
  const metricsQuery = useQuery({ queryKey: ["landlords", "metrics"], queryFn: () => crmMetrics({}) });
  const metrics = metricsQuery.data || {};
  const metricsReady = metricsQuery.isSuccess;
  const contacted = metricsReady ? (metrics.contacted ?? 0) : "—";
  const conversations = metricsReady ? (metrics.conversations ?? 0) : "—";
  const total = metricsReady ? (metrics.total ?? 0) : "—";

  // Full CRM list: incremental cursor pagination — an initial page, then
  // "Load more" for history. The browser is never handed hundreds at once.
  const listQuery = useInfiniteQuery({
    queryKey: ["landlords", "list"],
    queryFn: ({ pageParam }) => pageParam
      ? base44.entities.Landlord.filter({ created_date: { $lt: pageParam } }, "-created_date", PAGE_SIZE)
      : base44.entities.Landlord.list("-created_date", PAGE_SIZE),
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_date : undefined)
  });
  const landlords = useMemo(() => listQuery.data?.pages.flat() ?? [], [listQuery.data]);

  const [view, setView] = useState("list");
  const [showAdd, setShowAdd] = useState(false);
  const [logFor, setLogFor] = useState(null);
  const [form, setForm] = useState({ name: "", company: "", type: "private", stage: "not contacted", email: "", phone: "", notes: "", next_action_date: "" });
  const [log, setLog] = useState({ channel: "email", template: "", outcome: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const sendQueue = useMemo(() => queue.filter((l) => !l.next_action_date || l.next_action_date <= today), [queue, today]);

  // Optimistically patch one landlord inside the paginated list cache.
  const patchLandlordInList = (id, patch) => {
    queryClient.setQueryData(["landlords", "list"], (old) => {
      if (!old) return old;
      return { ...old, pages: old.pages.map((page) => page.map((l) => (l.id === id ? { ...l, ...patch } : l))) };
    });
  };

  // Queue + metrics are small/cheap; refetch them after any change so they stay
  // accurate without re-downloading the paginated history list.
  const refreshLight = () => {
    queryClient.invalidateQueries({ queryKey: ["landlords", "queue"] });
    queryClient.invalidateQueries({ queryKey: ["landlords", "metrics"] });
  };

  const addMutation = useMutation({
    mutationFn: (payload) => base44.entities.Landlord.create(payload),
    onSuccess: (newRecord) => {
      queryClient.setQueryData(["landlords", "list"], (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        pages[0] = [newRecord, ...(pages[0] || [])];
        return { ...old, pages };
      });
      refreshLight();
    }
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage, date }) => base44.entities.Landlord.update(id, { stage, last_contact_date: date }),
    onMutate: async ({ id, stage, date }) => {
      await queryClient.cancelQueries({ queryKey: ["landlords", "list"] });
      const prev = queryClient.getQueryData(["landlords", "list"]);
      patchLandlordInList(id, { stage, last_contact_date: date });
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["landlords", "list"], ctx.prev);
      setError("We couldn't update this landlord's stage. Please try again.");
    },
    onSuccess: () => refreshLight()
  });

  const logMutation = useMutation({
    mutationFn: async ({ logFor, log, ll }) => {
      await base44.entities.OutreachLog.create({
        landlord_id: logFor, landlord_name: ll?.name || "", channel: log.channel, template: log.template, outcome: log.outcome,
        date: new Date().toISOString().slice(0, 10)
      });
      const bumped = !!(ll && ll.stage === "not contacted");
      if (bumped) await base44.entities.Landlord.update(logFor, { stage: "contacted", last_contact_date: new Date().toISOString().slice(0, 10) });
      return { bumped };
    },
    onSuccess: (res, vars) => {
      if (res.bumped) patchLandlordInList(vars.logFor, { stage: "contacted", last_contact_date: new Date().toISOString().slice(0, 10) });
      refreshLight();
    }
  });

  const addLandlord = async () => {
    if (!form.name) return;
    setError("");
    setSaving(true);
    try {
      await addMutation.mutateAsync({ ...form });
      setForm({ name: "", company: "", type: "private", stage: "not contacted", email: "", phone: "", notes: "", next_action_date: "" });
      setShowAdd(false);
    } catch (e) {
      console.error("Landlord create failed", e);
      setError("We couldn't save this yet. Your information is still on this screen — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const moveStage = (id, stage) => {
    setError("");
    moveStageMutation.mutate({ id, stage, date: today });
  };

  const saveLog = async () => {
    const ll = [...queue, ...landlords].find((l) => l.id === logFor);
    setError("");
    setSaving(true);
    try {
      await logMutation.mutateAsync({ logFor, log, ll });
      setLogFor(null);
      setLog({ channel: "email", template: "", outcome: "" });
    } catch (e) {
      console.error("Outreach log failed", e);
      setError("We couldn't save this yet. Your information is still on this screen — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (listQuery.isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;
  if (listQuery.isError) return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-brand-mutedtext">We couldn't load your landlords right now.</p>
      <Button variant="outline" className="border-brand-line text-brand-text" onClick={() => listQuery.refetch()}>Try again</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2"><Users className="w-6 h-6 text-brand-gold" /> Landlord CRM</h1>
          <p className="text-brand-mutedtext text-sm">{contacted} contacted · {conversations} conversations this week (goal 10-15) · {total} total</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-brand-line p-0.5 bg-brand-raised">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${view === "list" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext"}`}><List className="w-4 h-4" /> List</button>
            <button onClick={() => setView("kanban")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${view === "kanban" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedtext"}`}><LayoutGrid className="w-4 h-4" /> Board</button>
          </div>
          <Button className="bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>}

      <Card className="border-brand-gold/40 bg-brand-gold/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-2"><Send className="w-4 h-4 text-brand-gold" /><span className="text-sm font-semibold text-brand-text">Daily send queue</span></div>
          {queueQuery.isLoading ? (
            <p className="text-sm text-brand-mutedtext">Loading today's work…</p>
          ) : queueQuery.isError ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-mutedtext">We couldn't load today's queue.</span>
              <Button variant="link" className="text-brand-gold px-0 h-auto py-0" onClick={() => queueQuery.refetch()}>Retry</Button>
            </div>
          ) : sendQueue.length === 0 ? (
            <p className="text-sm text-brand-mutedtext">You're all caught up on follow-ups. Add new landlords to keep the pipeline warm.</p>
          ) : (
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
        <LandlordKanban landlords={landlords} stages={STAGES} onMove={moveStage} onLog={(id) => setLogFor(id)} />
      )}

      {listQuery.hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" className="border-brand-line text-brand-text" onClick={() => listQuery.fetchNextPage()} disabled={listQuery.isFetchingNextPage}>
            <ChevronDown className="w-4 h-4 mr-1" /> {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
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
                  <Button className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={addLandlord} disabled={saving}>{saving ? "Saving…" : "Add landlord"}</Button>
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
                  <Button className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90" onClick={saveLog} disabled={saving}>{saving ? "Saving…" : <><Phone className="w-4 h-4 mr-1" /> Log touch</>}</Button>
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