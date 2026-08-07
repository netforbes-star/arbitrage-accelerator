import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Called by the Sign-In Audit workflow on every signup/login.
// Runs as service role (no app user in a workflow context).
export default async function (req) {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.AuditLog.create({
      actor_email: body.email || "",
      actor_role: body.role || "",
      action: body.activity === "signup" ? "sign_up" : "sign_in",
      details: `Signed in via ${body.auth_method || "password"}`
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}