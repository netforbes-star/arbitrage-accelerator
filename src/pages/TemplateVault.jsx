import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { FileText, Search } from "lucide-react";

export default function TemplateVault() {
  const { profile } = useHostProfile();
  const [templates, setTemplates] = useState([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await base44.entities.Template.list("title", 50);
      setTemplates(t);
      setActive(t[0] || null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin" /></div>;

  const fill = (content) => {
    if (!content) return "";
    return content
      .replace(/\{\{host_name\}\}/g, profile?.created_by || "Your name")
      .replace(/\{\{market_city\}\}/g, profile?.target_market_city || "your market")
      .replace(/\{\{property_address\}\}/g, "[your property address]")
      .replace(/\{\{all_in_cost\}\}/g, "[your all-in monthly cost]")
      .replace(/\{\{first_name\}\}/g, "[first name]");
  };

  const filtered = templates.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand flex items-center gap-2"><FileText className="w-6 h-6" /> Template Vault</h1>
        <p className="text-slate-500 text-sm">Read-only templates that fill in your market, property, and name. Admins can edit these.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
          </div>
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? "border-brand bg-brand/5" : "border-slate-200 hover:bg-slate-50"}`}>
              <div className="text-sm font-medium text-slate-800">{t.title}</div>
              <div className="text-xs text-slate-400">{t.category}</div>
            </button>
          ))}
        </div>

        <Card className="lg:col-span-2 border-slate-200">
          <CardContent className="py-5">
            {active ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-brand">{active.title}</h2>
                  <span className="text-xs text-slate-400">{active.category}</span>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700">
                  <ReactMarkdown>{fill(active.content)}</ReactMarkdown>
                </div>
                {active.variables && <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">Variables: {active.variables}</p>}
              </>
            ) : <p className="text-sm text-slate-400">Select a template.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}