import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Single authority for audit record creation.
// The browser may propose: action, target_type, target_id, details,
// target_user_email. It may NOT set actor identity or timestamp —
// those are derived server-side from the authenticated session.
// actor_email / actor_role come from base44.auth.me(); the timestamp
// is the platform-managed created_date. The record is written with the
// service role so it bypasses the (browser-blocking) AuditLog create RLS.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = String(body.action || "").slice(0, 200);
    if (!action) return Response.json({ error: "action is required" }, { status: 400 });

    const details = String(body.details || "").slice(0, 2000);
    const target_user_email = String(body.target_user_email || "").slice(0, 320);
    const target_type = String(body.target_type || "").slice(0, 100);
    const target_id = String(body.target_id || "").slice(0, 200);

    await base44.asServiceRole.entities.AuditLog.create({
      action,
      actor_email: user.email || "",
      actor_role: user.role || "",
      details,
      target_user_email,
      target_type,
      target_id
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}