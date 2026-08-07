/**
 * Role model — single-coach edition.
 *
 * There are exactly two kinds of people in this application:
 *
 *   host   the customer working the 28-day program
 *   staff  the one business owner who coaches and administers it
 *
 * `coach` and `admin` are both staff and are treated identically. They exist
 * as two values only because accounts were already created under both; there
 * is no behavioural difference and no reason to add one while a single person
 * runs the program. Prefer `admin` for new staff accounts.
 *
 * Deliberately absent: coach assignment, coach directories, reassignment,
 * team permissions. One coach needs none of it, and every one of those
 * mechanisms is a place for a permission bug to hide.
 */

export const STAFF_ROLES = ["coach", "admin"];

export const isStaff = (role) => STAFF_ROLES.includes(role);
export const isHost = (role) => !isStaff(role);

/** Normalised label for display. */
export const roleLabel = (role) => (isStaff(role) ? "Coach/Admin" : "Host");
