import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useHostProfile } from "@/lib/useHostProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import ExternalLink from "@/components/ExternalLink";
import { FileText, Search } from "lucide-react";

const mdComponents = {
  h1: ({ children }) => <h1 className="text-lg font-semibold text-brand-text mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-brand-text mt-4 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-brand-text mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-brand-mutedtext leading-relaxed mb-2">{children}</p>,
  li: ({ children }) => <li className="text-sm text-brand-mutedtext leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="text-brand-text font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-brand-text/90 italic">{children}</em>,
  // Lists and rules were unstyled, so long templates rendered with browser
  // defaults: bullets clipped at the container edge and a near-invisible <hr>
  // on the dark ground. Checklists are the main thing this vault holds, so
  // they need to render properly.
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 mb-3 marker:text-brand-gold/70">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 mb-3 marker:text-brand-gold/70">{children}</ol>,
  hr: () => <hr className="border-0 border-t border-brand-line my-5" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand-gold pl-4 my-3 text-sm text-brand-mutedtext">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-xs bg-brand-raised border border-brand-line rounded px-1.5 py-0.5 text-brand-text">{children}</code>
  ),
  // Fenced blocks hold copy-and-send email bodies. Without a styled `pre` they
  // fell back to browser defaults: no wrapping, so a 70-column email ran off
  // the right edge on a phone, and no ground of its own on the dark theme.
  pre: ({ children }) => (
    <pre className="font-mono text-xs bg-brand-raised border border-brand-line rounded-lg p-4 my-3 overflow-x-auto whitespace-pre-wrap break-words text-brand-text">{children}</pre>
  ),
  // Must route through ExternalLink: a raw target="_blank" is silently
  // swallowed inside the sandboxed preview frame.
  a: ({ href, children }) => (
    <ExternalLink href={href} showIcon={false} className="text-brand-gold hover:underline">{children}</ExternalLink>
  )
};

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

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" /></div>;

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
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2"><FileText className="w-6 h-6 text-brand-gold" /> Template Vault</h1>
        <p className="text-brand-mutedtext text-sm">Read-only templates that fill in your market, property, and name. Admins can edit these.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-mutedtext" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
          </div>
          {templates.length === 0 && (
            <div className="p-4 rounded-lg border border-brand-gold/40 bg-brand-gold/5 text-sm text-brand-mutedtext">
              Your templates haven't loaded yet. Nothing is wrong on your end — reach out to your coach and we'll get
              them switched on.
            </div>
          )}
          {templates.length > 0 && filtered.length === 0 && (
            <div className="p-4 rounded-lg border border-brand-line text-sm text-brand-mutedtext">
              No template matches "{query}". Try a different word.
            </div>
          )}
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? "border-brand-gold bg-brand-gold/10" : "border-brand-line bg-brand-surface hover:bg-brand-raised"}`}>
              <div className="text-sm font-medium text-brand-text">{t.title}</div>
              <div className="text-xs text-brand-mutedtext">{t.category}</div>
            </button>
          ))}
        </div>

        <Card className="lg:col-span-2 border-brand-line">
          <CardContent className="py-5">
            {active ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-brand-text">{active.title}</h2>
                  <span className="text-xs text-brand-mutedtext">{active.category}</span>
                </div>
                <div className="max-w-none">
                  <ReactMarkdown components={mdComponents}>{fill(active.content)}</ReactMarkdown>
                </div>
                {active.variables && <p className="text-xs text-brand-mutedtext mt-4 border-t border-brand-line pt-3">Variables: {active.variables}</p>}
              </>
            ) : <p className="text-sm text-brand-mutedtext">Select a template.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}