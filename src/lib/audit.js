import { writeAudit } from "@/functions/writeAudit";

// Append-only audit logging from the app. The browser never creates an
// AuditLog record directly — it asks the writeAudit backend function to,
// which derives actor identity and timestamp from the authenticated
// session. Sign-ins are still logged by the Sign-In Audit workflow via
// the logSignIn service-role function.
export async function logAudit(action, details, targetUserEmail) {
  try {
    await writeAudit({
      action,
      details: details || "",
      target_user_email: targetUserEmail || ""
    });
  } catch {
    // Audit logging must never break the host's workflow.
  }
}