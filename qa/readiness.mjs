/**
 * Arbitrage Accelerator — user readiness suite.
 *
 * Run from the app root:   node qa/readiness.mjs
 * Exits non-zero if anything fails, so it can gate a release.
 *
 * This lives outside src/, so it is never bundled into the shipped app.
 * Re-run it after any change to the underwriting math, the security rules,
 * the theme, the terms, or the export boundary.
 */
import fs from 'fs';
import path from 'path';
import { analyzeDeal, DEFAULTS } from '../src/lib/dealMath.js';

const R = { pass: [], fail: [], warn: [] };
const ok = (n, d = '') => R.pass.push([n, d]);
const bad = (n, d = '') => R.fail.push([n, d]);
const wrn = (n, d = '') => R.warn.push([n, d]);
const chk = (c, n, d = '') => (c ? ok(n, d) : bad(n, d));

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const at = (...p) => path.join(ROOT, ...p);
const read = (f) => fs.readFileSync(f, 'utf8');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
};
const src = walk(at('src'));
const appFiles = src.filter((f) => !f.includes('/components/ui/'));

/* ── A. UNDERWRITING MATH ─────────────────────────────────────────────── */
{
  const r = analyzeDeal({ revenue_mode: 'monthly', monthly_str_revenue: 2200, monthly_rent: 800, utilities: 150 });
  chk(Math.abs(r.grossRevenue - 2200 * 0.85) < 0.01,
    'A1 monthly mode applies haircut only, never occupancy twice', `gross=$${r.grossRevenue.toFixed(0)}`);
}
{
  const r = analyzeDeal({ revenue_mode: 'nightly', nightly_adr: 120, monthly_rent: 800, utilities: 150 });
  chk(Math.abs(r.grossRevenue - 2160) < 0.01, 'A2 nightly mode = ADR x occupancy x 30', `gross=$${r.grossRevenue.toFixed(0)}`);
}
{
  const r = analyzeDeal({ revenue_mode: 'nightly', nightly_adr: 120, monthly_rent: 800, utilities: 150, furnishing_cost: 2000 });
  const recomputed = r.grossRevenue - r.variableCosts - r.furnitureReserve - 800 - 150 - r.maintenance;
  chk(Math.abs(recomputed - r.cashProfit) < 0.01, 'A3 cash profit reconciles line by line', `cash=$${r.cashProfit.toFixed(0)}`);
  chk(Math.abs((r.cashProfit - r.managementValue) - r.trueProfit) < 0.01, 'A4 true profit = cash minus your time', `true=$${r.trueProfit.toFixed(0)}`);
}
{
  const lo = analyzeDeal({ revenue_mode: 'monthly', monthly_str_revenue: 2000, monthly_rent: 900, utilities: 150 });
  const hi = analyzeDeal({ revenue_mode: 'monthly', monthly_str_revenue: 5000, monthly_rent: 900, utilities: 150 });
  chk(lo.verdict === 'FAIL' && hi.verdict === 'PASS', 'A5 $500 floor gates PASS/FAIL in both directions');
  chk(lo.failFix.length > 40, 'A6 a FAIL always explains what must change');
}
{
  let nan = false;
  for (const f of [{}, { monthly_rent: 'abc' }, { revenue_mode: 'monthly', monthly_str_revenue: '' }]) {
    const r = analyzeDeal(f);
    if ([r.grossRevenue, r.cashProfit, r.trueProfit].some((v) => Number.isNaN(v))) nan = true;
  }
  chk(!nan, 'A7 empty and garbage input never produce NaN');
}
chk(DEFAULTS.occupancy === 0.6 && DEFAULTS.costRatio === 0.3 && DEFAULTS.profitFloor === 500,
  'A8 conservative defaults match the coaching deck', '60% occupancy / 30% costs / $500 floor');

/* ── B. TENANT ISOLATION ──────────────────────────────────────────────── */
const HOST_OWNED = ['BuyBox', 'Market', 'Landlord', 'Deal', 'OutreachLog', 'UserTaskProgress', 'ObjectionResponse', 'OnboardingProfile'];
const entity = (n) => JSON.parse(read(at('base44/entities', n + '.jsonc')).replace(/^\s*\/\/.*$/gm, ''));
for (const name of HOST_OWNED) {
  const rls = entity(name).rls;
  chk(!!rls, `B ${name}: has an RLS block`);
  chk(JSON.stringify(rls?.read || {}).includes('created_by_id'), `B ${name}: read scoped to owner`);
  chk(JSON.stringify(rls?.read) !== '{}', `B ${name}: read is NOT world-readable`);
  chk(JSON.stringify(rls?.create || {}).includes('created_by_id'), `B ${name}: create pins ownership server-side`);
  for (const op of ['update', 'delete']) {
    const r = JSON.stringify(rls?.[op] || {});
    // Deal.update is deliberately sealed to the browser so the status rules in
    // the saveDeal function cannot be bypassed by a direct entity write.
    const sealedByDesign = name === 'Deal' && op === 'update';
    chk(sealedByDesign ? r.includes('__system_never__') : r.includes('created_by_id'),
      `B ${name}: ${op} ${sealedByDesign ? 'sealed, backend-only' : 'scoped to owner'}`);
  }
  // Single-coach model: access is never granted by a field the host controls.
  for (const op of ['read', 'update', 'delete'])
    chk(!JSON.stringify(rls?.[op] || {}).includes('data.coach_id'),
      `B ${name}: ${op} does not grant access via host-writable coach_id`);
}
{
  const a = entity('AuditLog');
  chk(JSON.stringify(a.rls.read).includes('admin'), 'B AuditLog: readable by admin only');
  const sealed = (v) => JSON.stringify(v).includes('__system_never__');
  chk(sealed(a.rls.update) && sealed(a.rls.delete), 'B AuditLog: append-only, no role can edit history');
  chk(sealed(a.rls.create), 'B AuditLog: browser cannot forge an entry, service role only');
  const auditLib = read(at('src/lib/audit.js'));
  chk(!/entities\.AuditLog\.create/.test(auditLib), 'B AuditLog: client never writes the entity directly');
  chk(/writeAudit/.test(auditLib), 'B AuditLog: client routes through the writeAudit backend function');
  const wa = read(at('base44/functions/writeAudit/entry.ts'));
  chk(/asServiceRole\.entities\.AuditLog\.create/.test(wa), 'B AuditLog: backend writes with service role');
  chk(/actor_email:\s*user\.email/.test(wa) && /actor_role:\s*user\.role/.test(wa),
    'B AuditLog: actor identity derived from the session, not the request body');
  chk(!/body\.actor_email|body\.actor_role/.test(wa), 'B AuditLog: browser cannot override actor identity');
}
{
  const u = entity('User');
  chk(!!u.rls, 'B User: RLS present in the repo file (survives redeploy)');
  const upd = JSON.stringify(u.rls?.update || {});
  chk(upd.includes('admin') && !upd.includes('created_by_id') && !upd.includes('{{user.id}}'),
    'B User: update is staff-only, blocks self role escalation');
  chk(Array.isArray(u.required) && u.required.length === 0, 'B User: no required fields that would break sign-up');

  // Single-coach model assertions
  const roles = read(at('src/lib/roles.js'));
  chk(/STAFF_ROLES\s*=\s*\["coach", ?"admin"\]/.test(roles), 'B roles: coach and admin are one staff concept');
  const srcAll = src.map(read).join('\n');
  chk(!/coachAssign|assigned_coach|coach_id:\s*coachId/.test(srcAll),
    'B no coach-assignment logic remains in the client');
  chk(!/coachId/.test(srcAll), 'B no per-host coach routing left in the client');
  for (const e of ['Deal', 'Landlord', 'OnboardingProfile'])
    chk(!!entity(e).properties.coach_id, `B ${e}.coach_id retained for backwards compatibility`);
}

/* ── B2. DEAL WORKFLOW ENFORCEMENT ────────────────────────────────────── */
{
  const fn = read(at('base44/functions/saveDeal/entry.ts'));
  chk(/auth\.me\(\)/.test(fn), 'B2 saveDeal authenticates the caller');
  chk(/isStaff|STAFF_ROLES/.test(fn), 'B2 saveDeal checks ownership or staff');
  chk(/lease signed[\s\S]{0,400}permission_artifact_url/.test(fn) ||
      /permission_artifact_url[\s\S]{0,400}lease signed/.test(fn),
    'B2 lease-signed requires a permission artifact');
  chk(/We can't mark this deal as lease signed yet/.test(fn), 'B2 rejection message is user-friendly');
  chk(!/stack|errno|ECONN|SQL/.test(fn.split('return reject')[1] || ''), 'B2 no technical codes leak to the user');
  chk(/asServiceRole\.entities\.Deal\.update/.test(fn), 'B2 updates run with service role, past the sealed RLS');
  chk(/entities\.Deal\.create/.test(fn) && !/asServiceRole\.entities\.Deal\.create/.test(fn),
    'B2 creates run user-scoped so ownership lands on the real host');
  chk(/toStatus === "passed" && fromStatus === "lease signed"/.test(fn),
    'B2 "passed" means the host declined, reachable pre-signature');
  chk(!/toStatus === "passed" && fromStatus !== "lease signed"/.test(fn),
    'B2 declining a failed deal is not blocked by an inverted rule');
  chk(/INITIAL_STATUSES/.test(fn), 'B2 new deals cannot start in a protected stage');
  chk(/delete payload\.created_by_id/.test(fn), 'B2 client cannot forge ownership on save');
  const page = read(at('src/pages/DealAnalyzer.jsx'));
  chk(/saveDeal\(/.test(page), 'B2 client saves through the backend function');
  chk(!/entities\.Deal\.(create|update)/.test(page), 'B2 client never writes the Deal entity directly');
}

/* ── C. ROUTE + ROLE GUARDS ───────────────────────────────────────────── */
{
  const app = read(at('src/App.jsx'));
  chk(app.includes('RoleRoute') && app.includes('CoachWorkspace'), 'C1 staff workspace wrapped in RoleRoute');
  chk(/allow=\{STAFF_ROLES\}/.test(app), 'C2 staff routes gated by the shared STAFF_ROLES list');
  chk(/\/coach"\s+element=\{<Navigate to="\/workspace"/.test(app) &&
      /\/admin"\s+element=\{<Navigate to="\/workspace"/.test(app),
    'C2b legacy /coach and /admin redirect, no ungated duplicates');
  chk(app.includes('ProtectedRoute'), 'C3 authenticated shell present');
  const t = app.indexOf('path="/terms"'), p = app.indexOf('<Route element={<ProtectedRoute');
  chk(t > -1 && t < p, 'C4 /terms readable before signing in');
}

/* ── D. CREDENTIAL LEAKAGE ────────────────────────────────────────────── */
{
  const pats = [
    [/\bpassword\s*[:=]\s*["'][^"']{3,}/i, 'hardcoded password literal'],
    [/(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i, 'hardcoded key or secret'],
    [/console\.log\([^)]*(password|token|secret|credential)/i, 'credential written to console']
  ];
  let leaks = 0;
  for (const f of src) for (const [re, label] of pats)
    if (re.test(read(f))) { bad('D leak: ' + label, f.replace(ROOT + '/', '')); leaks++; }
  if (!leaks) ok('D1 no hardcoded credentials or secrets in source');
  chk(!/\.(password|password_hash|token|session)/.test(read(at('src/pages/CoachWorkspace.jsx'))),
    'D2 staff workspace renders no authentication material');
}

/* ── E. DARK THEME CONTRAST (WCAG) ────────────────────────────────────── */
{
  const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const lum = (c) => { const s = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const P = { ink: '#09091F', surface: '#11122B', raised: '#191A3B', text: '#F2F3FA', muted: '#A9ACC9', gold: '#CDAA4C' };
  for (const [n, fg, bg] of [
    ['body text on page ground', P.text, P.ink],
    ['body text on card', P.text, P.surface],
    ['muted text on card', P.muted, P.surface],
    ['muted text on page ground', P.muted, P.ink],
    ['gold accent on card', P.gold, P.surface],
    ['gold accent on ground', P.gold, P.ink],
    ['dark text on gold button', P.ink, P.gold],
    ['text on raised surface', P.text, P.raised]
  ]) {
    const r = ratio(fg, bg);
    chk(r >= 4.5, `E ${n}`, `${r.toFixed(2)}:1 (AA needs 4.5)`);
  }
}

/* ── F. LIGHT-MODE LEFTOVERS ──────────────────────────────────────────── */
{
  const light = /\b(bg-white|bg-slate-50|bg-slate-100|bg-gray-50|bg-gray-100|text-slate-[789]00|text-gray-[789]00|border-slate-[12]00)\b/g;
  const hits = [];
  for (const f of appFiles) { const m = read(f).match(light); if (m) hits.push(`${f.replace(ROOT + '/src/', '')}(${m.length})`); }
  chk(!hits.length, 'F1 no light-mode classes remain in app code', hits.join(', '));
  chk(/--background:\s*240 45% 7%/.test(read(at('src/index.css'))), 'F2 dark tokens active on :root');
}

/* ── G. TERMS & CONSENT ───────────────────────────────────────────────── */
{
  const legal = read(at('src/lib/legal.js'));
  chk(/TERMS_VERSION\s*=\s*"[\d.]+"/.test(legal), 'G1 terms version pinned');
  const sections = (legal.match(/heading:/g) || []).length;
  chk(sections >= 15, 'G2 all policy sections present', `${sections} sections`);
  const acks = (legal.match(/key:\s*"/g) || []).length;
  chk(acks >= 6, 'G3 separate acknowledgements, not one blanket checkbox', `${acks} checkboxes`);
  for (const kw of ['legal, tax', 'subletting', 'no result is guaranteed', 'financial risk'])
    chk(legal.toLowerCase().includes(kw.toLowerCase()), `G4 discloses: ${kw}`);
  const onb = read(at('src/pages/Onboarding.jsx'));
  chk(onb.includes('terms_accepted_at') && onb.includes('TERMS_VERSION'), 'G5 acceptance timestamped and versioned');
  chk(onb.includes('logAudit') && onb.includes('terms_accepted'), 'G6 acceptance written to audit log');
  chk(read(at('src/pages/Home.jsx')).includes('terms_version !== TERMS_VERSION'), 'G7 version bump re-prompts existing hosts');
  const prof = entity('OnboardingProfile');
  for (const f of ['terms_accepted_at', 'terms_version', 'acknowledgements_accepted'])
    chk(!!prof.properties[f], `G8 OnboardingProfile.${f} persisted`);
}

/* ── H. CONTENT READINESS ─────────────────────────────────────────────── */
{
  const seed = read(at('base44/functions/seedContent/entry.ts'));
  const days = (seed.match(/week:\s*\d+,\s*day:\s*\d+/g) || []).length;
  chk(days === 28, 'H1 all 28 program days defined', `${days} days`);
  chk((seed.match(/gate:\s*true/g) || []).length >= 6, 'H2 gate days defined');
  chk((seed.match(/title:\s*"/g) || []).length > 30, 'H3 templates and day titles populated');
}

/* ── I. EXPORT / IP BOUNDARY ──────────────────────────────────────────── */
{
  const ex = read(at('src/lib/exportData.js'));
  const PROTECTED = ['ProgramDay', 'Template', 'ObjectionEntry', 'AuditLog', 'CoachFeedback'];
  for (const e of PROTECTED)
    chk(new RegExp(`NEVER_EXPORT[\\s\\S]{0,220}${e}`).test(ex), `I1 ${e} declared never-exportable`);

  const entities = [...ex.matchAll(/entity:\s*"(\w+)"/g)].map((m) => m[1]);
  chk(entities.length > 0, 'I2 export allowlist non-empty', entities.join(', '));
  for (const e of PROTECTED) chk(!entities.includes(e), `I2 ${e} absent from the export allowlist`);

  const fields = [...ex.matchAll(/fields:\s*\[([\s\S]*?)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([\w_]+)"/g)].map((x) => x[1]));
  chk(fields.length > 40, 'I3 field allowlists populated', `${fields.length} fields`);
  for (const b of ['annette_answer', 'why_it_matters', 'instructions', 'tasks', 'content', 'title'])
    chk(!fields.includes(b), `I3 "${b}" is never exported`);

  chk(/NEVER_EXPORT\.includes\(def\.entity\)[\s\S]{0,120}throw/.test(ex), 'I4 fetchDataset throws on a protected entity');
  chk(/BLOCKED_FIELDS\.includes\(f\)[\s\S]{0,60}continue/.test(ex), 'I4 scrub drops blocked fields');
  chk(/filter\(\(f\)\s*=>\s*!BLOCKED_FIELDS\.includes\(f\)\)/.test(ex), 'I4 CSV writer drops blocked fields');
  chk(!/asServiceRole/.test(ex), 'I5 export never uses service role, stays RLS-scoped');
  chk(/base44\.entities\[def\.entity\]\.list/.test(ex), 'I5 export reads through the RLS-scoped client');

  const page = read(at('src/pages/ExportData.jsx'));
  chk(/logAudit\(\s*["']data_export["']/.test(page), 'I6 exports write an audit entry');
  chk((page.match(/logAudit\(/g) || []).length >= 2, 'I6 per-dataset and full export both audited');

  for (const f of ['src/pages/TemplateVault.jsx', 'src/pages/Program.jsx', 'src/components/ObjectionSection.jsx', 'src/components/BuyBoxSection.jsx']) {
    const c = read(at(f));
    chk(!/(navigator\.clipboard|window\.print|createObjectURL|download\s*=|saveAs|toBlob)/.test(c),
      `I7 no content-extraction control in ${f.split('/').pop()}`);
  }
  chk(!/exportData/.test(read(at('src/pages/TemplateVault.jsx'))), 'I7 Template Vault cannot reach the export module');

  const legal = read(at('src/lib/legal.js'));
  chk(legal.includes('net4bes@nnaed.com'), 'I8 contact email is current');
  let stale = 0;
  for (const f of src) if (/magaccommodations|netforbes/.test(read(f))) stale++;
  chk(stale === 0, 'I8 no stale contact address anywhere in source');

  const layout = read(at('src/components/Layout.jsx'));
  // Nav is now three groups: primary workflow, secondary tools, staff-only.
  const staffBlock = layout.slice(layout.indexOf('/workspace') - 400, layout.indexOf('/workspace') + 200);
  chk(/"\/export"/.test(layout), 'I9 Download link present for hosts');
  chk(!/"\/export"[\s\S]{0,80}STAFF_ROLES/.test(layout), 'I9 export not gated to staff only');
  chk(/STAFF_ROLES|isStaff/.test(staffBlock), 'I9 workspace nav entry is staff-gated');
  chk(read(at('src/App.jsx')).includes('path="/export"'), 'I9 /export route registered');
}

/* ── J. FAILURE HANDLING ─────────────────────────────────────────────── */
{
  const WORKFLOWS = ['DealAnalyzer', 'MarketAnalyzer', 'LandlordCRM', 'Onboarding', 'CoachWorkspace', 'Resources'];
  for (const w of WORKFLOWS) {
    const c = read(at(`src/pages/${w}.jsx`));
    chk(/try\s*\{/.test(c) && /catch/.test(c), `J ${w}: guarded with try/catch`);
    chk(/finally/.test(c), `J ${w}: releases busy state in a finally block`);
    chk(/please try again/i.test(c) || />\s*Try again\s*</i.test(c),
      `J ${w}: shows a friendly retry message or a retry control`);
    chk(!/\{\s*(e|err|error)\.message\s*\}/.test(c), `J ${w}: never renders a raw error message`);
    chk(!/\{\s*(e|err|error)\.stack\s*\}/.test(c), `J ${w}: never renders a stack trace`);
  }
  for (const w of WORKFLOWS) {
    const c = read(at(`src/pages/${w}.jsx`));
    for (const flag of ['setSaving', 'setBusy', 'setDeleting']) {
      const on = (c.match(new RegExp(`${flag}\\(true\\)`, 'g')) || []).length;
      const off = (c.match(new RegExp(`${flag}\\(false\\)`, 'g')) || []).length;
      if (on) chk(off >= on, `J ${w}: ${flag} always cleared`, `${on} on / ${off} off`);
    }
  }
  {
    const m = read(at('src/pages/MarketAnalyzer.jsx'));
    const save = m.slice(m.indexOf('const save ='), m.indexOf('const remove ='));
    const on = (save.match(/setSaving\(true\)/g) || []).length;
    const off = (save.match(/setSaving\(false\)/g) || []).length;
    chk(on >= 1 && off >= on, 'J MarketAnalyzer: every save path clears the saving state', `${on} on / ${off} off`);
    chk(/finally\s*\{[\s\S]{0,80}setSaving\(false\)/.test(save), 'J MarketAnalyzer: saving cleared in finally');
    chk(save.indexOf('setForm({ ...EMPTY })') > save.indexOf('Market.create'),
      'J MarketAnalyzer: form only cleared after a successful save');
  }
}

/* ── K. REACT QUERY CORRECTNESS ──────────────────────────────────────── */
{
  const RQ_PAGES = ['DealAnalyzer', 'MarketAnalyzer', 'LandlordCRM'];
  for (const p of RQ_PAGES) {
    const c = read(at(`src/pages/${p}.jsx`));
    chk(/useQuery|useInfiniteQuery/.test(c), `K ${p}: reads via useQuery`);
    chk(/useMutation/.test(c), `K ${p}: writes via useMutation`);
    // TanStack v5: set/getQueryData take the key ARRAY. Passing a filters
    // object writes to a phantom key, so optimistic updates silently no-op
    // and error rollback restores undefined.
    chk(!/(set|get)QueryData\(\s*\{/.test(c),
      `K ${p}: set/getQueryData use the key array, not a filters object`);
    // invalidate/cancel are the opposite: they DO take a filters object.
    for (const m of ['invalidateQueries', 'cancelQueries']) {
      const calls = c.match(new RegExp(`${m}\\(([^)]*)\\)`, 'g')) || [];
      for (const call of calls)
        chk(/\{\s*queryKey/.test(call), `K ${p}: ${m} passes a filters object`, call.slice(0, 60));
    }
  }
  const crm = read(at('src/pages/LandlordCRM.jsx'));
  chk(/queryKey:\s*\["landlords",\s*"queue"\]/.test(crm), 'K CRM: daily action queue is its own query');
  chk(/useInfiniteQuery/.test(crm), 'K CRM: full list paginates incrementally');
  chk(/queryKey:\s*\["landlords",\s*"metrics"\]/.test(crm), 'K CRM: metrics are a separate query');
  chk(!/Landlord\.list\("-created_date",\s*(200|500|1000)\)/.test(crm),
    'K CRM: no unbounded full-collection load');
}

/* ── L. SCHEMA HARDENING ─────────────────────────────────────────────── */
{
  const ALL = fs.readdirSync(at('base44/entities')).map((f) => f.replace('.jsonc', ''));

  // Security blocks must survive every schema edit.
  chk(JSON.stringify(entity('Deal').rls.update).includes('__system_never__'),
    'L Deal.update still sealed after schema hardening');
  const al = entity('AuditLog').rls;
  chk(['create', 'update', 'delete'].every((o) => JSON.stringify(al[o]).includes('__system_never__')),
    'L AuditLog still sealed after schema hardening');
  for (const name of HOST_OWNED)
    chk(JSON.stringify(entity(name).rls.read).includes('created_by_id'),
      `L ${name} read rule survived schema hardening`);

  // Values that are legitimately negative must not be floored at zero.
  const CAN_BE_NEGATIVE = [['Deal', 'cash_profit'], ['Deal', 'true_profit'],
    ['Deal', 'profit_margin_pct'], ['Market', 'arbitrage_spread']];
  for (const [e, f] of CAN_BE_NEGATIVE) {
    const p = entity(e).properties[f] || {};
    chk(p.minimum === undefined || p.minimum < 0, `L ${e}.${f} not floored at zero`, JSON.stringify(p.minimum));
  }

  // Scores are constrained to the 1-10 system the app actually uses.
  for (const f of ['location_score', 'size_score', 'condition_score']) {
    const p = entity('Deal').properties[f] || {};
    chk(p.maximum === 10, `L Deal.${f} capped at the 10-point scale`, `max=${p.maximum}`);
  }

  // Every status-like field is a closed enum.
  for (const [e, f] of [['Deal', 'status'], ['Deal', 'verdict'], ['Deal', 'permission_type'],
    ['Landlord', 'stage'], ['Landlord', 'type'], ['Market', 'regulation_status'],
    ['Market', 'recommendation'], ['User', 'role']]) {
    const p = entity(e).properties[f] || {};
    chk(Array.isArray(p.enum) && p.enum.length > 0, `L ${e}.${f} is a closed enum`, (p.enum || []).join('|'));
  }

  // No free-text field left uncapped.
  let uncapped = [];
  for (const name of ALL) {
    const props = entity(name).properties || {};
    for (const [f, p] of Object.entries(props)) {
      if (p.type !== 'string' || p.enum || p.format) continue;
      if (p.maxLength === undefined) uncapped.push(`${name}.${f}`);
    }
  }
  chk(uncapped.length === 0, 'L every free-text field has a length cap', uncapped.slice(0, 8).join(', '));
}

/* ── M. RESOURCES & EXTERNAL LINKS ───────────────────────────────────── */
{
  const page = read(at('src/pages/Resources.jsx'));
  const list = read(at('src/components/resources/ResourceList.jsx'));
  const mgr  = read(at('src/components/resources/ResourceManager.jsx'));
  const both = page + list + mgr;

  // Superseded by section N. Markup alone was never sufficient: a raw
  // target="_blank" is silently dropped in a sandboxed frame. The behaviour
  // is now asserted there; here we only confirm the shared component is used.
  chk(/ExternalLink/.test(list), 'M external links go through the shared opener');
  chk(/rel="noopener noreferrer"/.test(list), 'M external links carry noopener noreferrer');
  chk(/ExternalLink|external/i.test(list), 'M external links are visually marked as leaving the app');
  chk(/hostname|new URL|domain/i.test(list), 'M destination domain shown so nobody clicks blind');
  chk(/third-party|do not control|does not control/i.test(both), 'M third-party disclaimer present');

  // Resource management is staff-only in the UI as well as the data layer.
  chk(/STAFF_ROLES|isStaff/.test(page), 'M resource management gated to staff in the UI');
  const r = entity('Resource');
  chk(JSON.stringify(r.rls.read) === '{}', 'M resources readable by every signed-in host');
  for (const op of ['create', 'update', 'delete'])
    chk(/admin/.test(JSON.stringify(r.rls[op])) && /coach/.test(JSON.stringify(r.rls[op])),
      `M Resource.${op} restricted to staff`);
  chk(r.properties.url.format === 'uri', 'M resource url validated as a URI');

  // The Resources page is a curated link list — it must not become a place
  // curriculum or template content leaks out of.
  const ex = read(at('src/lib/exportData.js'));
  chk(!/entity:\s*"Resource"/.test(ex), 'M Resource not added to the data export');

  // Shell branding — this is what a host sees in the browser tab.
  const html = read(at('index.html'));
  chk(!/Base44 APP/.test(html), 'M page title is not the platform default');
  chk(/<title>Arbitrage Accelerator/.test(html), 'M page title is branded');
  chk(!/base44\.com\/logo/.test(html), 'M favicon is not the platform logo');
  chk(/theme-color"\s+content="#09091F"/.test(html), 'M browser chrome matches the dark theme');
  chk(/name="description"/.test(html), 'M meta description present for sharing');
}

/* ── N. HOST JOURNEY — DEAD ENDS, EMPTY STATES, FAILURE VISIBILITY ────── */
/* Added after a walkthrough audit of the app from a host's point of view.  */
{
  const layout = read(at('src/components/Layout.jsx'));
  const dash = read(at('src/pages/Dashboard.jsx'));
  const prog = read(at('src/pages/Program.jsx'));
  const grad = read(at('src/pages/Graduation.jsx'));
  const vault = read(at('src/pages/TemplateVault.jsx'));
  const app = read(at('src/App.jsx'));

  /* N1 — Graduation must be reachable. The whole 28 days ends there. */
  chk(/to:\s*"\/graduation"/.test(layout), 'N1 Graduation reachable from the sidebar');
  chk(/to="\/graduation"/.test(dash), 'N1 Graduation reachable from the Dashboard');
  chk(/to="\/graduation"/.test(prog), 'N1 Graduation reachable from Day 28 in the Program');
  chk(/path="\/graduation"/.test(app), 'N1 /graduation route still registered');

  // ...and must not be a dead end itself.
  chk(/to="\/program"/.test(grad) && /to="\/"/.test(grad), 'N1 Graduation links back out to program and dashboard');
  chk(!/window\.history\.back/.test(grad), 'N1 Graduation uses real links, not browser history');

  /* N2 — Unseeded curriculum must explain itself, not look broken. */
  chk(/days\.length === 0/.test(prog), 'N2 Program handles an unseeded curriculum');
  chk(/being set up/i.test(prog), 'N2 Program explains an empty curriculum in plain language');
  chk(/days\.length === 0/.test(dash), 'N2 Dashboard handles an unseeded curriculum');
  chk(/being set up/i.test(dash), 'N2 Dashboard explains an empty curriculum in plain language');
  chk(/templates\.length === 0/.test(vault), 'N2 Template Vault handles an empty vault');
  chk(!/All caught up/.test(dash.split('days.length === 0')[0]),
    'N2 empty curriculum is not mistaken for a finished day');

  /* N3 — Every host-facing mutation reports failure. A silent drop on a gate
     task lets a host believe they unlocked a week they have not. */
  for (const [label, body] of [['Program', prog], ['Graduation', grad]]) {
    const tries = (body.match(/try\s*\{/g) || []).length;
    const catches = (body.match(/catch\s*\(/g) || []).length;
    chk(tries > 0 && catches >= tries, `N3 ${label} guards every try with a catch`);
  }
  chk(/const toggle = async[\s\S]{0,900}?catch/.test(prog), 'N3 Program.toggle reports a failed save');
  chk(/const doSkip = async[\s\S]{0,900}?catch/.test(prog), 'N3 Program.doSkip reports a failed save');
  chk(/const toggle = async[\s\S]{0,1200}?finally/.test(prog), 'N3 Program.toggle clears busy state in finally');
  chk(/const doSkip = async[\s\S]{0,1200}?finally/.test(prog), 'N3 Program.doSkip clears busy state in finally');
  chk(/busyTask/.test(prog), 'N3 Program shows a busy state while a task saves');
  chk(/setLoadError|loadError/.test(prog), 'N3 Program surfaces a failed load instead of an eternal spinner');
  chk(/setLoadError|loadError/.test(dash), 'N3 Dashboard surfaces a failed load');
  chk(/catch/.test(grad) && /setError/.test(grad), 'N3 Graduation surfaces a failed load');

  /* N4 — No raw platform error text ever reaches a host. */
  const helper = at('src/lib/friendlyError.js');
  chk(fs.existsSync(helper), 'N4 a shared friendly-error helper exists');
  const leaks = [];
  for (const f of appFiles) {
    const body = read(f);
    if (/(setError|description:|title:)\s*\(?\s*(err|error|e)\.message/.test(body)) leaks.push(path.basename(f));
    if (/\{\s*(err|error|e)\.message\s*\}/.test(body)) leaks.push(path.basename(f));
  }
  chk(leaks.length === 0, 'N4 no screen renders a raw error message', leaks.join(', ') || 'none');
  for (const f of ['src/pages/Login.jsx', 'src/pages/Register.jsx', 'src/pages/ResetPassword.jsx',
                   'src/pages/OAuthConsent.jsx', 'src/pages/ExportData.jsx', 'src/pages/Dashboard.jsx']) {
    chk(/friendlyError/.test(read(at(f))), `N4 ${path.basename(f)} sanitises error text`);
  }
  const fe = read(helper);
  chk(/401|403/.test(fe) && /5\d\d|>=\s*500/.test(fe), 'N4 helper distinguishes permission from server failures');
  chk(/console\.error/.test(fe), 'N4 helper still logs the real error for debugging');

  /* N5 — "passed" means the host declined. Never show the bare enum. */
  const dm = read(at('src/lib/dealMath.js'));
  chk(/DEAL_STATUS_LABELS/.test(dm), 'N5 deal statuses have host-facing labels');
  chk(/passed[^\n]*passed on this deal/i.test(dm), 'N5 "passed" is spelled out as declining the deal');
  chk(/lost[^\n]*landlord/i.test(dm), 'N5 "lost" distinguishes itself from passing');
  const da = read(at('src/pages/DealAnalyzer.jsx'));
  chk(!/\{s\}<\/SelectItem>/.test(da), 'N5 status dropdown does not render the bare enum');
  chk(/dealStatusLabel\(s\)/.test(da), 'N5 status dropdown renders the friendly label');
  chk(/dealStatusShortLabel\(d\.status\)/.test(da), 'N5 deal list badge renders the friendly label');
  chk(/dealStatusShortLabel/.test(read(at('src/components/workspace/HostsTab.jsx'))),
    'N5 staff host view renders the friendly label too');
  // The stored contract must not have drifted.
  chk(/"passed"/.test(dm) && /DEAL_STATUSES = \[[^\]]*"passed"/.test(dm),
    'N5 stored status values are unchanged — labels are display-only');

  /* N6 — No host-facing link may point at a staff-only route. */
  const hostPages = appFiles.filter((f) => /\/pages\//.test(f) && !/CoachWorkspace/.test(f));
  const badLinks = [];
  for (const f of hostPages) {
    const body = read(f);
    // A <Navigate> inside a role check is a legitimate staff redirect; only a
    // link a host can actually click is a dead end for them.
    const clickable = body.match(/<(?:Link|NavLink)\b[^>]*\bto="\/(coach|admin|workspace)"/g) || [];
    if (clickable.length) badLinks.push(path.basename(f));
  }
  chk(badLinks.length === 0, 'N6 no host screen links a host to a staff-only route', badLinks.join(', ') || 'none');
  // Guard the specific regression this replaced: the Dashboard recalibrate card
  // used to send a stuck host to /coach, which bounces them straight back.
  chk(!/<Link[^>]*to="\/coach"/.test(dash), 'N6 recalibrate card no longer sends hosts to /coach');
}

/* ── O. SPRINT OUTCOME — WHAT THE PROGRAM PROMISED ───────────────────── */
/* The sprint's success bar is a signed lease OR an active prospect headed    */
/* toward one, produced in four weeks. These checks hold the app to that.     */
{
  const grad = read(at('src/pages/Graduation.jsx'));
  const prog = read(at('src/pages/Program.jsx'));
  const dash = read(at('src/pages/Dashboard.jsx'));

  /* O1 — A warm prospect is a met outcome, not a near-miss. */
  chk(/hasWarmProspect\s*=\s*activeProspects\s*>\s*0\s*\|\|\s*warmLandlords\s*>\s*0/.test(grad),
    'O1 Graduation recognises an active prospect as an outcome');
  chk(/activeProspects\s*=\s*data\.deals\.filter[^\n]*negotiating/.test(grad),
    'O1 active negotiations are counted from real deal data');
  chk(/warmLandlords\s*=\s*data\.landlords\.filter[^\n]*(negotiating|property viewed)/.test(grad),
    'O1 landlords at the table are counted from real pipeline data');
  chk(/outcomeMet\s*=\s*signed\s*>\s*0\s*\|\|\s*hasWarmProspect/.test(grad),
    'O1 the outcome bar is signed OR warm prospect — both satisfy it');
  chk(/outcomeMet/.test(grad), 'O1 the sprint outcome is stated explicitly on the results screen');
  chk(/Sprint outcome/i.test(grad), 'O1 results screen names the outcome bar for the host');
  chk(!/didn't close[\s\S]{0,200}hasWarmProspect/.test(grad),
    'O1 a host with a live negotiation is never told they failed to close');
  chk(/signed === 0 && !hasWarmProspect/.test(grad),
    'O1 the consolation note is suppressed when the bar was met');
  chk(/Live prospects at the table/.test(grad), 'O1 prospects surface as a headline result, not a footnote');

  /* O2 — Delivery is rehearsed, not just written. */
  const drillPath = at('src/components/MockPitchDrill.jsx');
  chk(fs.existsSync(drillPath), 'O2 a mock pitch drill exists');
  const drill = read(drillPath);
  chk(/d\.day === 13 && <MockPitchDrill/.test(prog), 'O2 the drill renders on Day 13 in the program');
  chk(/import MockPitchDrill/.test(prog), 'O2 the drill is imported, not just referenced');
  for (const round of ['cold open', 'subletting', 'trash', 'repair', 'flat no']) {
    chk(new RegExp(round, 'i').test(drill), `O2 drill covers: ${round}`);
  }
  chk(/Airbnb/.test(drill) && /corporate leasing/.test(drill),
    'O2 drill warns about the two trigger words that earn an instant no');
  chk(/seconds:/.test(drill), 'O2 drill is timed — delivery is practised under pressure');
  // A rehearsal tool must not quietly become a new data surface.
  chk(!/base44\.entities/.test(drill), 'O2 drill stores nothing — no new data surface');
  chk(/Nothing is recorded or uploaded|no audio|not recorded/i.test(drill),
    'O2 drill tells the host nothing is recorded');

  /* O3 — The weekly calls exist inside the product. */
  const callPath = at('src/components/WeeklyCallCard.jsx');
  chk(fs.existsSync(callPath), 'O3 the weekly coaching call has a home in the app');
  const call = read(callPath);
  chk(/<WeeklyCallCard\s+week=/.test(dash), 'O3 call prep actually renders on the Dashboard');
  chk(/import WeeklyCallCard/.test(dash), 'O3 the call card is imported, not just referenced');
  for (const wk of ['1', '2', '3', '4']) chk(new RegExp(`\\s${wk}:\\s*\\{`).test(call), `O3 week ${wk} has its own agenda`);
  chk(/We decide|decide:/.test(call), 'O3 each call drives to a decision, not a status update');
  // Booking links are sent by the coach directly, by decision. The app holds
  // no link and no config for one — asserting their absence keeps a future
  // change from quietly reintroducing a setting nobody maintains.
  chk(!/bookingUrl/.test(call), 'O3 card holds no booking link');
  chk(!/coach will send the booking link/i.test(call),
    'O3 copy reads as deliberate, not as a missing link');
  chk(/sends the booking link/i.test(call), 'O3 host is told how the link actually arrives');
  const cfg = read(at('src/lib/programConfig.js'));
  chk(!/CALL_BOOKING_URL/.test(cfg), 'O3 no unused booking-link setting left in config');
  chk(!/CALL_BOOKING_URL/.test(dash), 'O3 Dashboard no longer imports the removed setting');

  /* O4 — Lease protection the sprint sold is actually in the curriculum. */
  const seed = read(at('base44/functions/seedContent/entry.ts'));
  chk(/repair-response window/i.test(seed), 'O4 written repair-response window is a curriculum task');
  chk(/48h urgent/i.test(seed), 'O4 repair window is specific, not a vague promise');
  chk(/\$200 repair threshold/.test(seed), 'O4 the $200 self-handled threshold survives');
  chk(/30-day exit/.test(seed), 'O4 exit terms survive');
  chk(/STR permission addendum/.test(seed), 'O4 sublet permission addendum survives');
  chk(/mock pitch drill/i.test(seed), 'O4 rehearsal is a scheduled task, not an optional extra');

  /* O5 — The four weeks still end where the guarantee says they do. */
  chk(/day: 20, gate: true/.test(seed), 'O5 written permission remains a hard gate');
  chk(/day: 22[\s\S]{0,600}?lease signed/.test(seed), 'O5 week 4 still drives to signature');
  chk(/GATE_DAYS = \[1, 3, 5, 8, 12, 16, 20\]/.test(read(at('src/lib/curriculum.js'))),
    'O5 gate days unchanged — the spine of the four weeks holds');

  /* O6 — Landlord outreach scripts are host-agnostic and actually render.
     These templates get copied verbatim by every host in the cohort. A real
     phone number or a coach's own company name left in one reaches every
     landlord they contact, so absence is asserted, not assumed. */
  chk(/title: "Landlord Outreach Email Scripts"/.test(seed),
    'O6 the landlord outreach scripts ship in the seed content');
  chk(/Track A/.test(seed) && /Track B/.test(seed),
    'O6 private landlord and management company are separate tracks');
  chk(/Two words to avoid/.test(seed),
    'O6 scripts carry the trigger-word warning the drill also teaches');
  // A US phone number in any shape. The 555 examples in the placeholder key
  // are deliberate and excluded; anything else is a real number that leaked.
  const seedTemplates = seed.slice(seed.indexOf('const templates = ['));
  const phones = (seedTemplates.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) || [])
    .filter((n) => !/555/.test(n));
  chk(phones.length === 0, `O6 no real phone number in any template (found: ${phones.join(', ') || 'none'})`);
  chk(!/Magnolia|Annette/i.test(seedTemplates),
    'O6 no coach-specific name or company inside a host-facing template');
  // Placeholders are the whole point — a rewrite that drops them silently
  // hands hosts a script that reads as someone else's business.
  const brackets = new Set(seedTemplates.match(/\[[A-Z][A-Z0-9 #\-\/]*\]/g) || []);
  chk(brackets.size >= 15, `O6 scripts carry a real placeholder set (${brackets.size} distinct)`);

  /* O7 — The vault renders what the templates actually contain.
     react-markdown here runs without remark-gfm, so a table renders as literal
     pipes and a GFM task list as literal "[ ]". Both have to stay out. */
  chk(!/^\s*\|.*\|/m.test(seedTemplates),
    'O7 no markdown table in a template — the vault cannot render one');
  chk(!/- \[ \]/.test(seedTemplates),
    'O7 checkboxes use ☐, not GFM task syntax the vault renders literally');
  chk(/pre: \(\{ children \}\)/.test(vault),
    'O7 fenced email bodies get a styled block, not browser defaults');
  chk(/whitespace-pre-wrap/.test(vault),
    'O7 a 70-column email wraps instead of running off a phone screen');
  chk(/text\.includes\("\\n"\)/.test(vault),
    'O7 inline code and fenced blocks are styled apart, not identically');
}

/* ── N. EXTERNAL LINKS ACTUALLY OPEN ─────────────────────────────────── */
{
  // A plain <a target="_blank"> is silently swallowed inside a sandboxed
  // iframe that omits allow-popups — which is how the Base44 preview renders
  // the app. Correct markup is NOT sufficient; the click must be intercepted.
  const shared = read(at('src/components/ExternalLink.jsx'));
  chk(/window\.open\(/.test(shared), 'N shared link component opens the window itself');
  chk(/if\s*\(win\)/.test(shared) || /win\s*\?/.test(shared),
    'N detects a blocked pop-up via the window.open return value');
  chk(/window\.top/.test(shared), 'N falls back to navigating the top frame');
  chk(/clipboard\.writeText/.test(shared), 'N offers copy-link when every path is blocked');
  chk(/metaKey|ctrlKey/.test(shared), 'N leaves modified clicks (new tab) to the browser');
  chk(/rel="noopener noreferrer"/.test(shared), 'N keeps noopener on the anchor');

  // No app screen may hand-roll an external anchor and reintroduce the bug.
  const offenders = [];
  for (const f of appFiles) {
    if (f.endsWith('ExternalLink.jsx')) continue;
    const c = read(f);
    // Router <Link target="_blank"> is internal navigation — exempt.
    const raw = c.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
    if (raw.length) offenders.push(`${f.replace(ROOT + '/src/', '')}(${raw.length})`);
  }
  chk(offenders.length === 0,
    'N no raw external anchors left — all route through ExternalLink', offenders.join(', '));

  // The resource card, not just the title, is the click target.
  const list = read(at('src/components/resources/ResourceList.jsx'));
  chk(/ExternalLink/.test(list) && !/from "lucide-react"[\s\S]{0,40}ExternalLink/.test(list),
    'N resource list uses the shared component');
  chk(/absolute inset-0/.test(list), 'N whole resource card is clickable');
  chk(/\[&>\*\]:relative|className="[^"]*relative/.test(list),
    'N click overlay is bounded to its own card');
}

/* ── O. TEMPLATE VAULT RENDERING ─────────────────────────────────────── */
{
  const v = read(at('src/pages/TemplateVault.jsx'));
  // Long checklists are the main thing the vault holds. Unstyled list and
  // rule elements fall back to browser defaults, which read badly on dark.
  for (const el of ['ul:', 'ol:', 'hr:', 'em:', 'blockquote:', 'code:'])
    chk(new RegExp(`\\n\\s*${el}`).test(v), `O markdown <${el.replace(':','')}> is styled for the dark theme`);
  chk(/marker:text-brand-gold/.test(v), 'O list markers use the brand accent');
  chk(/ExternalLink/.test(v), 'O markdown links route through the sandbox-safe opener');
  chk(!/<a\b[^>]*target="_blank"/.test(v), 'O vault contains no raw external anchor');

  // The Template entity must be able to hold a real checklist.
  const t = entity('Template');
  chk(t.properties.content.maxLength >= 12000,
    'O Template.content can hold a long-form checklist', `max=${t.properties.content.maxLength}`);
  chk(t.properties.content.maxLength <= 50000, 'O Template.content is still bounded');
  chk(JSON.stringify(t.rls.create).includes('admin'), 'O Template writes still admin-only');
  chk(JSON.stringify(t.rls.read) === '{}', 'O Templates still readable by every host');
}

/* ── REPORT ───────────────────────────────────────────────────────────── */
const line = '─'.repeat(64);
console.log('\n' + line);
console.log(`PASS ${R.pass.length}   FAIL ${R.fail.length}   WARN ${R.warn.length}`);
console.log(line);
if (R.fail.length) { console.log('\nFAILURES'); R.fail.forEach(([n, d]) => console.log(`  x ${n}${d ? ' — ' + d : ''}`)); }
if (R.warn.length) { console.log('\nWARNINGS'); R.warn.forEach(([n, d]) => console.log(`  ! ${n}${d ? ' — ' + d : ''}`)); }
console.log('\nPASSED');
R.pass.forEach(([n, d]) => console.log(`  ok ${n}${d ? ' — ' + d : ''}`));
process.exit(R.fail.length ? 1 : 0);
