/**
 * Sprint configuration.
 *
 * One place to set the things that change per cohort without touching a screen.
 * Edit the value, save, and it is live everywhere it is used.
 */

/**
 * Booking link for the weekly 30-minute coaching call.
 *
 * Paste your scheduler URL between the quotes — Calendly, GHL, Google
 * Appointments, whatever you use. Leave it empty and the app simply tells the
 * host their coach will send a link, so nothing breaks either way.
 *
 * Example: export const CALL_BOOKING_URL = "https://calendly.com/nursenet/sprint-call";
 */
export const CALL_BOOKING_URL = "";

/** Weekly 30-minute calls are part of the sprint. */
export const WEEKLY_CALL_MINUTES = 30;

/**
 * The sprint's success bar, in the host's own words. Used on the Graduation
 * screen so what the app measures and what was promised stay the same thing.
 */
export const SPRINT_OUTCOME = "a signed lease — or an active prospect clearly headed toward one";
