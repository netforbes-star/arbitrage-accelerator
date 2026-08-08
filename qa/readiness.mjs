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

  chk(/target="_blank"/.test(list), 'M external links open in a new tab');
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
