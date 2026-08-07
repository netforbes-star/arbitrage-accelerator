import { base44 } from "@/api/base44Client";

// Append-only audit logging from the app. Sign-ins are logged by the
// Sign-In Audit workflow; role changes and admin record access are logged here.
export async function logAudit(action, details, targetUserEmail) {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      action,
      details: details || "",
      target_user_email: targetUserEmail || "",
      actor_email: user?.email || "",
      actor_role: user?.role || ""
    });
  } catch (e) {
    // Audit logging must never break the host's workflow.
  }
}