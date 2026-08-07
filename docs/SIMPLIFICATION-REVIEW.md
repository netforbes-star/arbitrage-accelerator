# Arbitrage Accelerator — Microapp Simplification Review

> **Status:** Review only. No code, routes, navigation, entities, or styling were changed.
> **Business context:** One coach runs the entire program. No multi-coach, coach-assignment, coach-directory, team-management, or enterprise-permissions features should exist.
> **Primary host journey:** Dashboard → Market Analyzer → Deal Analyzer → Landlord Pipeline → Program.

---

## 1. Current state

### Routes (from `src/App.jsx`)
| Route | Screen | Audience |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | Public |
| `/terms` | Terms & Privacy | Public |
| `/` | Home → redirects to `/admin` (admin) or `/coach` (coach); otherwise renders Dashboard or Onboarding | Host |
| `/onboarding` | Intake / terms re-acceptance | Host |
| `/program` | 28-day curriculum | Host |
| `/deals` | Deal Analyzer | Host |
| `/markets` | Market Analyzer | Host |
| `/landlords` | Landlord CRM (pipeline) | Host |
| `/templates` | Template Vault | Host |
| `/export` | Data export | Host |
| `/graduation` | End-of-program | Host |
| `/coach` | Coach Console | Staff |
| `/admin` | Admin Panel | Staff |
| `*` | PageNotFound | All |

### Primary navigation (from `src/components/Layout.jsx`, host-visible order)
1. Dashboard (`/`)
2. Program (`/program`)
3. Deal Analyzer (`/deals`)
4. Markets (`/markets`)
5. Landlords (`/landlords`)
6. Download (`/export`)
7. Templates (`/templates`)
8. Coach Console (`/coach`) — staff only
9. Admin (`/admin`) — staff only

Footer: user email, Terms & Privacy link, Sign out.

### Observations
- The nav order does **not** match the intended host journey (Program is 2nd; Markets and Landlords come after Deal Analyzer).
- Supporting tools (Download, Templates) sit at the same visual weight as the five core workflow screens.
- Coach Console and Admin share the host sidebar/layout; they are role-gated but not visually separated into their own workspace.
- `coach_id` fields exist on multiple entities (Landlord, Deal, Market, BuyBox, OutreachLog, UserTaskProgress, OnboardingProfile, ObjectionResponse, CoachFeedback). With a single coach these are vestigial assignment plumbing.

---

## 2. Recommendations by category

### ✅ KEEP PRIMARY (the five-screen host workflow)
| Item | Route | Notes |
|---|---|---|
| Dashboard | `/` | Entry point; keep first in nav. |
| Market Analyzer | `/markets` | Move up to **2nd** in nav (start of the funnel). |
| Deal Analyzer | `/deals` | 3rd in nav. |
| Landlord Pipeline | `/landlords` | 4th in nav. Consider relabeling "Landlords" → "Landlord Pipeline" to match journey language. |
| Program | `/program` | 5th in nav (last in the primary flow, not 2nd as today). |

### 📌 KEEP SECONDARY (available, but demoted out of the primary nav)
| Item | Route | Disposition |
|---|---|---|
| Onboarding | `/onboarding` | Keep as a route; reached from Home when no profile or stale terms. Not a nav item (already correct). |
| Templates | `/templates` | Keep route; move out of primary nav into a secondary "Resources / More" area. |
| Export / Download | `/export` | Keep route; move out of primary nav. Prefer a Dashboard action over a nav entry. |
| Graduation | `/graduation` | Keep route; reached from Dashboard/Program on completion. Not a nav item (already correct). |
| Terms & Privacy | `/terms` | Keep; already a footer link, not in nav (correct). |

### 🔗 MERGE
| Item | Recommendation |
|---|---|
| Coach Console + Admin → **one Coach Workspace** | With a single operator, merge `/coach` and `/admin` into a single workspace (e.g., `/workspace`) with internal tabs: Overview, Hosts, Curriculum, Templates, Audit. Eliminates the artificial split between "coaching" and "admin" for one person. |
| Templates + Export + Graduation + Terms → **secondary "More" group** | Collapse these four into one secondary nav group (or a single "Resources" entry with a submenu) so they stop competing with the five primary screens. The pages themselves stay separate. |
| Export → **Dashboard action** (optional alternative) | Export is an occasional task; it can live as a "Download my data" button on the Dashboard rather than any nav entry. |

### 🙈 HIDE FROM PRIMARY NAV (host)
| Item | Current | Recommendation |
|---|---|---|
| Templates | Primary nav (7th) | Remove from primary nav; relocate to secondary "More"/Resources group. |
| Download / Export | Primary nav (6th) | Remove from primary nav; relocate to secondary group or Dashboard action. |
| Coach Console | Staff-only nav entry | Hide from host nav entirely (already role-gated) and move into the separate Coach Workspace shell (see MERGE). |
| Admin | Staff-only nav entry | Same — merge into the Coach Workspace; no standalone Admin nav entry. |

### 🗑 REMOVE LATER (phase out, not this pass)
| Item | Why |
|---|---|
| `coach_id` fields on entities (Landlord, Deal, Market, BuyBox, OutreachLog, UserTaskProgress, OnboardingProfile, ObjectionResponse, CoachFeedback) | Single-coach model makes per-record coach assignment unnecessary. Phase out after confirming no reporting/filtering depends on them. |
| Any coach-assignment / coach-directory UI in Admin | No multi-coach; remove assignment controls and coach lists. |
| Any "team management" or enterprise-permission scaffolding | None found in routes/nav; if any surfaces, remove. |

### 🚀 PHASE 2 (future work, not now)
| Item | Notes |
|---|---|
| Dedicated Coach Workspace shell | A separate layout/nav for the merged coach+admin workspace, distinct from the host sidebar, so operator tooling never co-mingles with the host journey. |
| "Resources" hub | A single secondary page grouping Templates, Export, Graduation, and legal links. |
| Nav reorder + relabel | Reorder primary nav to Dashboard → Markets → Deals → Landlords → Program; relabel "Landlords" → "Landlord Pipeline", "Markets" → "Market Analyzer". |
| Onboarding intake refinement | Tighten the one-time flow; keep version-gated terms re-acceptance. |
| Graduation polish | Reachable only on completion; consider a celebratory state (no new deps assumed). |

---

## 3. Proposed primary nav (host) — for approval
```
1. Dashboard          /
2. Market Analyzer    /markets
3. Deal Analyzer      /deals
4. Landlord Pipeline  /landlords
5. Program            /program
   ─────────────
   More / Resources   (Templates, Export, Graduation, Terms)
```

## 4. Proposed coach workspace (single operator) — for approval
```
/workspace  (merged Coach + Admin)
  tabs: Overview · Hosts · Curriculum · Templates · Audit
```
- No standalone `/coach` or `/admin` nav entries.
- Hosts never see this workspace (role-gated, separate shell in Phase 2).

## 5. Out of scope for this review
- No entity changes (coach_id fields noted for later).
- No route removals — only nav placement and a future merge of the two staff screens.
- No styling changes.

---

**Awaiting approval before any implementation.**