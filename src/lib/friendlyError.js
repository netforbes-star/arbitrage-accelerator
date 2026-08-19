/**
 * User-facing error text.
 *
 * Platform and network errors carry strings that are useless to a host and
 * occasionally reveal backend internals ("Request failed with status code 500",
 * stack fragments, entity names). Nothing raw reaches a screen. Every catch
 * block routes through friendlyError() and gets a sentence a nurse-turned-host
 * can act on.
 *
 * The real error is still written to the console for debugging.
 */

const FRIENDLY = {
  network: "We couldn't reach the server. Check your connection and try again.",
  permission: "You don't have access to that. If you think that's wrong, reach out and we'll sort it.",
  notfound: "We couldn't find that — it may have been removed.",
  conflict: "That was changed somewhere else. Refresh and try again.",
  toolarge: "That file is too large. Try one under 10MB.",
  ratelimit: "That's a lot of requests at once. Give it a moment and try again.",
  server: "Something went wrong on our end. Try again in a moment.",
  generic: "Something didn't work. Try again — and if it keeps happening, let us know."
};

/**
 * Map any thrown value to a safe, warm, actionable sentence.
 * @param {unknown} err   the caught error
 * @param {string} [fallback] override for the generic case
 * @returns {string} text safe to render
 */
export function friendlyError(err, fallback) {
  if (typeof console !== "undefined" && console.error) {
    console.error("[handled]", err);
  }

  const status = err?.status ?? err?.response?.status ?? err?.statusCode;
  const raw = String(err?.message || "");

  if (status === 401 || status === 403) return FRIENDLY.permission;
  if (status === 404) return FRIENDLY.notfound;
  if (status === 409) return FRIENDLY.conflict;
  if (status === 413) return FRIENDLY.toolarge;
  if (status === 429) return FRIENDLY.ratelimit;
  if (typeof status === "number" && status >= 500) return FRIENDLY.server;

  if (/network|fetch|timeout|ECONN|offline/i.test(raw)) return FRIENDLY.network;

  return fallback || FRIENDLY.generic;
}

/**
 * Validation and workflow messages written by our own backend are already
 * host-readable and are the whole point of the rule (e.g. saveDeal's permission
 * message). Those pass through; anything else is sanitised.
 *
 * A message qualifies as intentional only if the backend marked it so.
 */
export function friendlyErrorAllowingBackendMessage(err, fallback) {
  const intentional = err?.userMessage || err?.response?.data?.userMessage;
  if (intentional && typeof intentional === "string") return intentional;
  return friendlyError(err, fallback);
}

export default friendlyError;
