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
  for (const op of ['update', 'delete'])
    chk(JSON.stringify(rls?.[op] || {}).includes('created_by_id'), `B ${name}: ${op} scoped to owner`);
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

/* ── C. ROUTE + ROLE GUARDS ───────────────────────────────────────────── */
{
  const app = read(at('src/App.jsx'));
  chk(app.includes('RoleRoute') && app.includes('AdminPanel'), 'C1 admin route wrapped in RoleRoute');
  chk(/allow=\{\['coach', ?'admin'\]\}/.test(app), 'C2 coach route role-gated');
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
  chk(!/\.(password|password_hash|token|session)/.test(read(at('src/pages/AdminPanel.jsx'))),
    'D2 admin panel renders no authentication material');
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
  // Match only the single nav object for /export. A looser span leaks into the
  // next nav entry and reports a false positive.
  const exportNav = (layout.match(/\{[^{}]*"\/export"[^{}]*\}/) || [''])[0];
  chk(exportNav.includes('"host"'), 'I9 Download link visible to hosts', exportNav.trim());
  chk(!exportNav.includes('"coach"'), 'I9 export not offered to coaches');
  chk(read(at('src/App.jsx')).includes('path="/export"'), 'I9 /export route registered');
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
