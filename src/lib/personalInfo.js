/**
 * Personal-information detector for host-facing content.
 *
 * Templates in the vault get copied verbatim by every host in the cohort and
 * sent to strangers — landlords, leasing offices, property managers. A real
 * phone number or a coach's own company name left inside one does not stay
 * inside the app: it reaches every landlord that every host contacts, and the
 * replies come back to the coach rather than the host.
 *
 * This module is the single definition of what counts as a leak. The readiness
 * suite runs it over the seed content at build time; the Coach Workspace runs
 * it in the editor before a template can be saved. Both import from here so a
 * rule can never be tightened in one place and forgotten in the other.
 */

// The 555 exchange is reserved for fiction, so 555 numbers are examples by
// definition. A bracketed token is a placeholder the host is meant to replace —
// that is the point of the scripts, not a leak.
const isDeliberateExample = (match) => /555/.test(match) || match.startsWith("[");

const RULES = [
  {
    kind: "phone number",
    // Any plausible US number. Deliberately broad: it is far better to ask
    // about a false positive than to ship a real number to 200 hosts.
    re: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}/g,
    note: "A phone number in a template becomes the number every host sends to every landlord."
  },
  {
    kind: "email address",
    re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/g,
    note: "Replies would route to this inbox instead of the host's.",
    // Example domains are the standard reserved-for-documentation set.
    allow: /@(example\.(com|org|net)|cedarlanestays\.com)$/i
  },
  {
    kind: "personal or company name",
    re: /\bAnnette\b|\bForbes\b|\bMagnolia\b|magaccommodations|netforbes/gi,
    note: "Host-facing scripts must read as the host's own business, not the coach's."
  },
  {
    kind: "portfolio property",
    re: /Brown Pelican|Creole Folks|Bayou Breeze/gi,
    note: "Names a real property in the coach's portfolio."
  },
  {
    kind: "account identifier",
    re: /magnoliaaccom-m3v1843|tXYLgVACBzc9Ff8h8yez/g,
    note: "An internal workspace or CRM identifier does not belong in host content."
  }
];

/**
 * Scan a block of text. Returns [] when clean, otherwise one entry per finding
 * with enough surrounding text for a human to judge it.
 */
export function findPersonalInfo(text) {
  if (!text) return [];
  const found = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of String(text).matchAll(rule.re)) {
      const hit = m[0];
      if (isDeliberateExample(hit)) continue;
      if (rule.allow && rule.allow.test(hit)) continue;
      const start = Math.max(0, m.index - 50);
      found.push({
        kind: rule.kind,
        match: hit,
        note: rule.note,
        context: String(text).slice(start, m.index + hit.length + 50).replace(/\s+/g, " ").trim()
      });
    }
  }
  return found;
}

/** True when the text carries nothing that traces back to a specific person. */
export const isHostSafe = (text) => findPersonalInfo(text).length === 0;
