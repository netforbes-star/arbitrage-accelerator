import { base44 } from "@/api/base44Client";

/**
 * Host data export.
 *
 * THE RULE: a host may download the RESULTS they produced. A host may not
 * download Nurse Net AED's instructional content.
 *
 * That distinction is enforced here by an allowlist, not a denylist. Only the
 * entities named in EXPORTABLE are ever fetched, and within each one only the
 * fields named in `fields` are ever written out. A new entity or a new field
 * is excluded by default until someone deliberately adds it, so the failure
 * mode of forgetting to update this file is "we exported too little," never
 * "we leaked the curriculum."
 *
 * Deliberately NOT exportable, and why:
 *   ProgramDay      — the 28-day curriculum. This is the product.
 *   Template        — value prop, scripts, addendum, SOPs. This is the product.
 *   ObjectionEntry  — Annette's answers. This is the product.
 *   AuditLog        — security record, admin-only by design.
 *   CoachFeedback   — authored by a coach, not a result the host produced.
 *
 * Within ObjectionResponse the host keeps the words they wrote and does not
 * get Annette's model answer. Within UserTaskProgress the host keeps their own
 * completion record and reflections, and gets no task text, no "why this
 * matters" copy, and no instructions.
 */

export const EXPORTABLE = [
  {
    key: "buy_box",
    entity: "BuyBox",
    label: "Buy Box",
    describe: "Your property criteria",
    fields: [
      "bedrooms", "bathrooms", "max_monthly_rent", "max_drive_time_minutes",
      "requires_fenced_yard", "pets_allowed", "parking_required",
      "furnished_allowed_required", "notes", "created_date", "updated_date"
    ]
  },
  {
    key: "markets",
    entity: "Market",
    label: "Markets",
    describe: "Every market you scored, with the data behind the score",
    fields: [
      "city", "state", "submarket", "adr", "occupancy_rate", "revpar",
      "active_listings", "comp_count", "comp_revenue_low", "comp_revenue_median",
      "comp_revenue_high", "average_market_rent", "regulation_status",
      "regulation_source_url", "data_pulled_date", "arbitrage_spread",
      "spread_ratio", "composite_score", "recommendation", "summary",
      "stale_data_flag", "thin_market_flag", "created_date", "updated_date"
    ]
  },
  {
    key: "landlords",
    entity: "Landlord",
    label: "Landlord Pipeline",
    describe: "Your contacts and where each one stands",
    fields: [
      "name", "company", "type", "stage", "email", "phone", "notes",
      "last_contact_date", "next_action_date", "created_date", "updated_date"
    ]
  },
  {
    key: "outreach",
    entity: "OutreachLog",
    label: "Outreach Log",
    describe: "Every touch you logged",
    fields: ["landlord_name", "channel", "outcome", "date", "created_date"]
  },
  {
    key: "deals",
    entity: "Deal",
    label: "Deals Underwritten",
    describe: "Every deal you ran, with inputs, assumptions and verdict",
    fields: [
      "nickname", "beds", "baths", "monthly_rent", "utilities", "furnishing_cost",
      "deposit", "drive_time_minutes", "location_score", "size_score",
      "condition_score", "revenue_mode", "nightly_adr", "monthly_str_revenue",
      "occupancy", "conservatism_haircut", "haircut_override_reason",
      "mtr_revenue_estimate", "permission_type", "gross_revenue",
      "variable_costs", "furniture_reserve", "cash_profit", "true_profit",
      "profit_margin_pct", "months_to_recoup", "recommended_strategy",
      "verdict", "status", "created_date", "updated_date"
    ]
  },
  {
    key: "objection_responses",
    entity: "ObjectionResponse",
    label: "Your Objection Responses",
    describe: "The answers you wrote in your own words",
    // annette_answer is intentionally absent — that is Nurse Net's content.
    fields: ["objection_key", "objection_text", "host_response", "updated_date"]
  },
  {
    key: "progress",
    entity: "UserTaskProgress",
    label: "Program Progress",
    describe: "Which days and tasks you completed, and when",
    // No curriculum text: no titles, no instructions, no "why this matters".
    fields: ["day", "task_index", "status", "skipped_reason", "completed_date"]
  }
];

/** Entities that must never appear in an export, asserted at runtime. */
export const NEVER_EXPORT = ["ProgramDay", "Template", "ObjectionEntry", "AuditLog", "CoachFeedback"];

/** Fields that must never leave the app even if an entity is exportable. */
const BLOCKED_FIELDS = ["annette_answer", "why_it_matters", "instructions", "tasks", "content", "coach_id", "created_by_id", "id"];

function scrub(record, allowedFields) {
  const out = {};
  for (const f of allowedFields) {
    if (BLOCKED_FIELDS.includes(f)) continue; // belt and braces
    const v = record[f];
    out[f] = v === undefined || v === null ? "" : v;
  }
  return out;
}

/** Fetch one dataset, RLS-scoped to the signed-in host, and strip it down. */
export async function fetchDataset(def) {
  if (NEVER_EXPORT.includes(def.entity)) {
    throw new Error(`${def.entity} is not exportable`);
  }
  const rows = await base44.entities[def.entity].list("-created_date", 500);
  return rows.map((r) => scrub(r, def.fields));
}

export function toCSV(rows, fields) {
  const cols = fields.filter((f) => !BLOCKED_FIELDS.includes(f));
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(",");
  if (!rows.length) return head + "\n";
  return [head, ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

export function download(filename, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export async function downloadOne(def) {
  const rows = await fetchDataset(def);
  download(`arbitrage-accelerator_${def.key}_${stamp()}.csv`, toCSV(rows, def.fields), "text/csv");
  return rows.length;
}

export async function downloadAll() {
  const bundle = {
    exported_at: new Date().toISOString(),
    export_contents: "Your own records only. Nurse Net AED curriculum, templates and coaching content are not included.",
    datasets: {}
  };
  let total = 0;
  for (const def of EXPORTABLE) {
    const rows = await fetchDataset(def);
    bundle.datasets[def.key] = { label: def.label, count: rows.length, records: rows };
    total += rows.length;
  }
  download(`arbitrage-accelerator_my-data_${stamp()}.json`, JSON.stringify(bundle, null, 2), "application/json");
  return total;
}
