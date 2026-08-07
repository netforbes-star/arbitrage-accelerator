import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Lightweight aggregate CRM metrics for the calling user.
//
// Returns counts only — the browser never loads the historical landlord
// list just to total the pipeline. Staff (coach/admin) see counts across
// all landlords (matching their RLS read); hosts see only their own.

const STAFF_ROLES = ["coach", "admin"];
const CONVERSATION_STAGES = ["conversation held", "property viewed", "negotiating", "won"];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Please sign in to view your CRM metrics." }, { status: 401 });

    const isStaff = STAFF_ROLES.includes(user.role);
    const query = isStaff ? {} : { created_by_id: user.id };
    const all = await base44.asServiceRole.entities.Landlord.filter(query, "-created_date", 1000);

    const byStage = {};
    let contacted = 0;
    let conversations = 0;
    let won = 0;
    let lost = 0;

    for (const l of all) {
      const stage = l.stage || "not contacted";
      byStage[stage] = (byStage[stage] || 0) + 1;
      if (stage !== "not contacted") contacted++;
      if (CONVERSATION_STAGES.includes(stage)) conversations++;
      if (stage === "won") won++;
      if (stage === "lost") lost++;
    }

    return Response.json({ ok: true, total: all.length, contacted, conversations, won, lost, byStage });
  } catch (error) {
    return Response.json({ error: "We couldn't load your CRM metrics right now." }, { status: 500 });
  }
}