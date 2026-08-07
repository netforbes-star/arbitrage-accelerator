import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Server-side authority for Deal status transitions.
//
// The browser may not move a Deal into a protected status by directly
// updating the entity — it must call this function, which validates the
// authenticated user, ownership/staff permission, and the prerequisite
// data for the transition before persisting via the service role.
//
// Single-coach model: "coach" and "admin" are both staff (the one business
// owner) and are treated identically. See src/lib/roles.js.

const STAFF_ROLES = ["coach", "admin"];
const isStaff = (role) => STAFF_ROLES.includes(role);

const ALL_STATUSES = ["evaluating", "outreach sent", "negotiating", "lease signed", "passed", "lost"];
// A brand-new deal may only start in an early stage; lease signed / passed /
// lost are reachable only via a validated transition.
const INITIAL_STATUSES = ["evaluating", "outreach sent", "negotiating"];

function reject(status, message) {
  return Response.json({ error: message }, { status });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return reject(401, "Please sign in to save this deal.");

    const body = await req.json().catch(() => ({}));
    const dealId = body.deal_id ? String(body.deal_id) : null;
    const fields = body.fields || {};
    const toStatus = String(fields.status || "evaluating");

    if (!ALL_STATUSES.includes(toStatus)) {
      return reject(400, "That isn't a valid deal status.");
    }

    // --- Load existing (for updates) and authorize ---
    let existing = null;
    let fromStatus = null;
    if (dealId) {
      existing = await base44.asServiceRole.entities.Deal.get(dealId);
      if (!existing) return reject(404, "We couldn't find that deal. Refresh and try again.");
      fromStatus = existing.status || "evaluating";
      const isOwner = existing.created_by_id === user.id;
      if (!isOwner && !isStaff(user.role)) {
        return reject(403, "You can only save your own deals.");
      }
    } else {
      // New deals can't start in a protected stage.
      if (!INITIAL_STATUSES.includes(toStatus)) {
        return reject(400, "A new deal starts at 'evaluating'. Work forward from there.");
      }
    }

    // --- Protected transition rules (only when status actually changes) ---
    if (fromStatus !== toStatus) {
      if (toStatus === "lease signed") {
        const permType = String(fields.permission_type ?? existing?.permission_type ?? "none");
        const artifact = String(fields.permission_artifact_url ?? existing?.permission_artifact_url ?? "");
        // Written permission required: verbal is not permission.
        if (permType === "none" || permType === "verbal" || !artifact) {
          return reject(400, "We can't mark this deal as lease signed yet. Add the required permission documentation and try again.");
        }
      }
      // "passed" means the HOST passed on the deal — they walked away. It is a
      // pre-signature outcome, reachable from any stage before a lease exists,
      // and it is the normal ending for a deal that fails underwriting. The
      // only thing that makes no sense is passing on a deal already signed.
      if (toStatus === "passed" && fromStatus === "lease signed") {
        return reject(400, "This lease is already signed, so it can't be marked as passed. Mark it lost if the deal fell through.");
      }
    }

    // --- Persist ---
    const payload = { ...fields };
    // Never let the client set identity/system fields.
    delete payload.id;
    delete payload.created_by_id;
    delete payload.created_date;
    delete payload.updated_date;

    if (dealId) {
      // Service role bypasses the (client-blocked) update RLS; we already
      // validated ownership/staff above.
      await base44.asServiceRole.entities.Deal.update(dealId, payload);
      return Response.json({ ok: true, id: dealId, status: toStatus });
    }

    // Create runs as the calling user so created_by_id is owned by the host.
    const created = await base44.entities.Deal.create(payload);
    return Response.json({ ok: true, id: created.id, status: toStatus });
  } catch (error) {
    return reject(500, "Something went wrong saving this deal. Please try again.");
  }
}