import { Card, CardContent } from "@/components/ui/card";
import ExternalLink from "@/components/ExternalLink";

const CATEGORIES = [
  "Getting Started",
  "Market Research",
  "Landlord Outreach",
  "Underwriting & Pricing",
  "Operations",
  "Legal & Compliance",
  "Finance & Tax"
];

const domainOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

/**
 * Read-only grouped list of published resources, sorted by sort_order then
 * title. Every link opens in a new tab with rel="noopener noreferrer" and shows
 * the destination domain so nobody clicks blind.
 */
export default function ResourceList({ resources }) {
  const published = (resources || [])
    .filter((r) => r.is_published)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.title || "").localeCompare(b.title || ""));

  const grouped = CATEGORIES
    .map((cat) => ({ cat, items: published.filter((r) => r.category === cat) }))
    .filter((g) => g.items.length > 0);

  if (grouped.length === 0) {
    return (
      <p className="text-brand-mutedtext py-10 text-center">Nothing here yet — Annette is building this out.</p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ cat, items }) => (
        <section key={cat}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-gold mb-3">{cat}</h2>
          <div className="grid sm:grid-cols-2 gap-3 [&>*]:relative">
            {items.map((r) => (
              <Card
                key={r.id}
                className="border-brand-line transition-colors hover:border-brand-gold/60 hover:bg-brand-raised/40"
              >
                <CardContent className="py-4 space-y-1.5">
                  <ExternalLink
                    href={r.url}
                    className="text-brand-text font-medium hover:text-brand-gold"
                  >
                    {/* Stretched: makes the whole card the click target, not just
                        the title text. The card is position-relative via the
                        wrapper below so the overlay is bounded to this card. */}
                    <span className="absolute inset-0 rounded-xl" aria-hidden="true" />
                    <span className="relative">{r.title}</span>
                  </ExternalLink>
                  <div className="text-xs text-brand-mutedtext">{domainOf(r.url)}</div>
                  {(r.source || r.author) && (
                    <div className="text-xs text-brand-mutedtext">{[r.source, r.author].filter(Boolean).join(" · ")}</div>
                  )}
                  {r.description && <p className="text-sm text-brand-mutedtext pt-1">{r.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}