import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// One-time content seeder: populates the 28-day curriculum (ProgramDay) and
// the Template Vault. Idempotent — skips entities that already have records.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const curriculum = [
      { week: 1, day: 1, gate: true, title: "Define your rental buy box", why_it_matters: "A sharp buy box keeps you from chasing every shiny listing and lets you underwrite in seconds.", tasks: [
        { title: "Set bedrooms/baths (default 2BR/1BA)", time_estimate: "10 min", completion_condition: "Bed/bath target recorded" },
        { title: "Set max monthly rent", time_estimate: "5 min", completion_condition: "Max rent number saved" },
        { title: "Set max drive time", time_estimate: "5 min", completion_condition: "Drive-time limit saved" },
        { title: "Set yard, pets, parking, furnished-allowed", time_estimate: "10 min", completion_condition: "All four preferences saved" }
      ]},
      { week: 1, day: 2, gate: false, title: "Market data pull", why_it_matters: "Real numbers beat gut feelings. ADR, occupancy, and RevPAR tell you if a market pays.", tasks: [
        { title: "Record ADR, occupancy, RevPAR, active listings from AirDNA/Rabbu", time_estimate: "45 min", completion_condition: "Four metrics recorded" },
        { title: "Build comp set of top 20 listings (low/median/high revenue)", time_estimate: "60 min", completion_condition: "20 comps with revenue ranges" },
        { title: "Flag data older than 6 months as stale; warn if under 10 comps", time_estimate: "10 min", completion_condition: "Data freshness checked" }
      ]},
      { week: 1, day: 3, gate: true, title: "Regulation check", why_it_matters: "A banned market is a dead market. Confirm from an official city source, not a blog.", tasks: [
        { title: "Confirm STR rules from an official city source", time_estimate: "45 min", completion_condition: "Official source URL recorded" },
        { title: "Record status: Permitted/Restricted/Banned/Pending", time_estimate: "5 min", completion_condition: "Status saved" },
        { title: "Upload screenshot of the regulation", time_estimate: "10 min", completion_condition: "Screenshot uploaded" }
      ]},
      { week: 1, day: 4, gate: false, title: "Supply check", why_it_matters: "Supply drives rent. Too many vacancies = soft rents = thin spreads.", tasks: [
        { title: "Record available 2BR/3BR units from Zillow and Apartments.com", time_estimate: "40 min", completion_condition: "Unit counts recorded" },
        { title: "Record average asking rent", time_estimate: "20 min", completion_condition: "Asking rent saved" }
      ]},
      { week: 1, day: 5, gate: true, title: "Market score", why_it_matters: "The spread ratio and composite score turn four days of research into one Go/Hold/No-Go.", tasks: [
        { title: "Calculate Arbitrage Spread (median STR revenue minus avg market rent)", time_estimate: "15 min", completion_condition: "Spread calculated" },
        { title: "Calculate spread ratio; score ADR/occupancy/regulation/supply/spread out of 100", time_estimate: "30 min", completion_condition: "Composite score saved" },
        { title: "Decide Go (75+)/Hold (50-74)/No-Go (<50) and 2x/2.5x spread thresholds", time_estimate: "10 min", completion_condition: "Decision recorded" }
      ]},
      { week: 1, day: 6, gate: false, title: "Legal foundation checklist", why_it_matters: "Keep arbitrage leases in their own LLC so liability never touches your owned property.", tasks: [
        { title: "Form a separate LLC for arbitrage leases", time_estimate: "60 min", completion_condition: "LLC filed" },
        { title: "Get STR-specific insurance on top of renter's insurance", time_estimate: "30 min", completion_condition: "STR policy in place" },
        { title: "Review the lease's no-subletting clause", time_estimate: "20 min", completion_condition: "Sublet clause reviewed" }
      ]},
      { week: 1, day: 7, gate: false, title: "Week 1 review", why_it_matters: "Reflection locks in what you learned and what you'll change.", tasks: [
        { title: "Write a Week 1 reflection", time_estimate: "20 min", completion_condition: "Reflection saved" }
      ]},
      { week: 2, day: 8, gate: true, title: "Build your landlord value proposition", why_it_matters: "Landlords don't rent to 'Airbnb people' — they rent to someone who solves their problem.", tasks: [
        { title: "Personalize the proven landlord value-prop script", time_estimate: "20 min", completion_condition: "Script personalized" },
        { title: "Select risk-mitigation offers (guaranteed rent, 25+ age, $200 repairs, noise monitoring, cleaning, STR insurance)", time_estimate: "15 min", completion_condition: "Offers selected" },
        { title: "Generate your one-page landlord value prop", time_estimate: "10 min", completion_condition: "Value prop generated" }
      ]},
      { week: 2, day: 9, gate: false, title: "Build landlord list (part 1)", why_it_matters: "Pipeline is protection. 100 contacts means one no never matters.", tasks: [
        { title: "Collect contacts from referrals, for-rent signs, Craigslist, direct mail, FB Marketplace, small PMs", time_estimate: "90 min", completion_condition: "40 contacts logged" }
      ]},
      { week: 2, day: 10, gate: false, title: "Build list (part 2) & segment", why_it_matters: "PM companies need a different script — direct about STR intent, never say 'Airbnb' or 'corporate leasing'.", tasks: [
        { title: "Segment private landlords vs property management companies", time_estimate: "30 min", completion_condition: "Each contact typed" },
        { title: "Draft PM-specific outreach (avoid trigger words; prepare the 'give me 30 seconds' rebuttal)", time_estimate: "30 min", completion_condition: "PM script ready" }
      ]},
      { week: 2, day: 11, gate: false, title: "Outreach sequence setup", why_it_matters: "Automation warms the lead; the personal call closes it. Always follow up by phone.", tasks: [
        { title: "Set up initial email, day-4 follow-up, day-10 breakup email, plus a phone script", time_estimate: "60 min", completion_condition: "Sequence ready" },
        { title: "Set 90-days-before-lease-renewal nurture reminders", time_estimate: "15 min", completion_condition: "Nurture reminders set" }
      ]},
      { week: 2, day: 12, gate: true, title: "Send your first 20 outreaches", why_it_matters: "You can't underwrite deals landlords never sent you. The send queue makes this automatic.", tasks: [
        { title: "Send 20 outreaches through the one-at-a-time send queue (10 for reduced-capacity hosts)", time_estimate: "90 min", completion_condition: "20 sends logged" }
      ]},
      { week: 2, day: 13, gate: false, title: "Objection-handling drill", why_it_matters: "The landlord says no in five predictable ways. Your answer is already written.", tasks: [
        { title: "Write your version of each objection response (subletting, trashing, can't pay, never heard, insurance, flat no)", time_estimate: "45 min", completion_condition: "All six responses written" },
        { title: "Run the mock pitch drill out loud — all five rounds, on the clock", time_estimate: "30 min", completion_condition: "All five rounds rehearsed aloud" }
      ]},
      { week: 2, day: 14, gate: false, title: "Week 2 review", why_it_matters: "Funnel math tells you what to fix next week.", tasks: [
        { title: "Log outreach count, responses, conversations booked, list size", time_estimate: "20 min", completion_condition: "Numbers recorded" }
      ]},
      { week: 3, day: 15, gate: false, title: "Learn the 5-point scorecard", why_it_matters: "A worked example trains your eye before you risk real money.", tasks: [
        { title: "Walk the worked example to a PASS verdict", time_estimate: "30 min", completion_condition: "Example reviewed" }
      ]},
      { week: 3, day: 16, gate: true, title: "Underwrite a real deal", why_it_matters: "First real deal in the analyzer turns theory into conviction.", tasks: [
        { title: "Run a real property through the Deal Analyzer", time_estimate: "45 min", completion_condition: "Deal saved with a verdict" }
      ]},
      { week: 3, day: 17, gate: false, title: "Underwrite deals 2-5", why_it_matters: "Volume sharpens judgment and keeps the pipeline warm.", tasks: [
        { title: "Underwrite deals 2-3 while the outreach queue keeps running", time_estimate: "90 min", completion_condition: "2 more deals saved" }
      ]},
      { week: 3, day: 18, gate: false, title: "Underwrite deals 4-5", why_it_matters: "Target 8-10 properties evaluated per month.", tasks: [
        { title: "Underwrite deals 4-5; keep daily outreach alive", time_estimate: "90 min", completion_condition: "2 more deals saved" }
      ]},
      { week: 3, day: 19, gate: false, title: "Negotiation prep", why_it_matters: "Your term sheet makes the landlord feel safe saying yes.", tasks: [
        { title: "Assemble STR permission addendum, 30-day exit, furnished clause, $200 repair threshold, utilities clarity", time_estimate: "60 min", completion_condition: "Term sheet generated" },
        { title: "Add a written repair-response window (48h urgent / 7d routine) — a slow landlord costs you paying guests", time_estimate: "20 min", completion_condition: "Response window written into the term sheet" }
      ]},
      { week: 3, day: 20, gate: true, title: "Written permission gate", why_it_matters: "Verbal permission isn't permission — a PM change ends it. No artifact, no signed lease.", tasks: [
        { title: "Record permission type (verbal/email/signed) and upload the evidence", time_estimate: "20 min", completion_condition: "Artifact uploaded; verbal flagged as insufficient" }
      ]},
      { week: 3, day: 21, gate: false, title: "Week 3 review", why_it_matters: "Pass rate and active negotiations show whether to push or pivot.", tasks: [
        { title: "Log deals underwritten, pass rate, active negotiations", time_estimate: "20 min", completion_condition: "Numbers recorded" }
      ]},
      { week: 4, day: 22, gate: false, title: "Close the deal", why_it_matters: "Final review with the no-subletting clause called out — then signature, deposit, keys.", tasks: [
        { title: "Final lease review (flag the no-subletting clause)", time_estimate: "30 min", completion_condition: "Lease reviewed" },
        { title: "Sign, pay deposit, get keys", time_estimate: "60 min", completion_condition: "Deal marked lease signed with artifact" }
      ]},
      { week: 4, day: 23, gate: false, title: "Furnishing budget", why_it_matters: "A room-by-room budget gets you listing-ready in 10 days.", tasks: [
        { title: "Build a room-by-room furnishing budget", time_estimate: "45 min", completion_condition: "Budget saved" }
      ]},
      { week: 4, day: 24, gate: false, title: "Smart home stack", why_it_matters: "$400-600 per property means 90% fewer lock issues and 50% fewer thermostat complaints — ROI in 2-3 months.", tasks: [
        { title: "Source smart lock ($250-400), thermostat preset 68F capped 72F ($150-250), noise monitor ($50-100), smart speaker ($50-100)", time_estimate: "60 min", completion_condition: "Stack sourced" }
      ]},
      { week: 4, day: 25, gate: false, title: "Pricing setup", why_it_matters: "Floor and ceiling pricing protects you from undercutting yourself.", tasks: [
        { title: "Auto-calculate nightly numbers from the deal's all-in cost (floor >= 1.5x, ceiling 2-3x market)", time_estimate: "30 min", completion_condition: "Pricing computed" },
        { title: "Set weekday -15%, weekend +25%, 28+ day MTR -10%", time_estimate: "15 min", completion_condition: "Modifiers saved" },
        { title: "Set a monthly comp-set audit reminder (8-10 neighborhood comps)", time_estimate: "10 min", completion_condition: "Reminder set" }
      ]},
      { week: 4, day: 26, gate: false, title: "Operations stack & turnover SOP", why_it_matters: "A repeatable turnover is the difference between profit and chaos.", tasks: [
        { title: "Pick a PMS (OwnerRez multi, Guesty 10+, Hospitable/Smoobu 1-5) and connect channels", time_estimate: "45 min", completion_condition: "PMS selected" },
        { title: "Hire 2-3 cleaner pairs and generate your filled-in turnover SOP", time_estimate: "60 min", completion_condition: "SOP generated" }
      ]},
      { week: 4, day: 27, gate: false, title: "Financial setup", why_it_matters: "Separate accounts and a tax reserve keep the IRS off your back. The app flags — it does not interpret tax law.", tasks: [
        { title: "Open a separate bank account per property", time_estimate: "30 min", completion_condition: "Account opened" },
        { title: "Set up QuickBooks Online or Wave + property P&L template", time_estimate: "45 min", completion_condition: "Books set up" },
        { title: "Move 25-30% of operating profit to savings monthly; set quarterly estimated tax reminders (Jan 15, Apr 15, Jun 15, Sep 15)", time_estimate: "20 min", completion_condition: "Reserve + reminders set" }
      ]},
      { week: 4, day: 28, gate: false, title: "Graduation", why_it_matters: "Your funnel data is the diagnosis — whether you signed or not.", tasks: [
        { title: "Review your results summary and diagnosis", time_estimate: "20 min", completion_condition: "Graduation viewed" }
      ]}
    ];

    const templates = [
      { title: "Landlord Value Prop One-Pager", category: "Sourcing", variables: "host_name, market_city", content: "## Landlord Value Proposition\n\nHi, I'm {{host_name}}. I'm looking for 2-3 bedroom homes landlords want to rent furnished or to corporate tenants in {{market_city}}.\n\n**What I handle:**\n- All management\n- Guaranteed rent\n- 30 days notice if you want your home back\n- No long-term commitment needed\n\n**My risk-mitigation offers:**\n- Guaranteed rent\n- 25+ guest age policy (no parties)\n- Repairs under $200 handled without bothering you\n- Noise monitoring\n- Professional cleaning\n- My own STR insurance\n\nI'd love 15 minutes to walk you through it." },
      { title: "3-Email Outreach Sequence", category: "Sourcing", variables: "host_name, market_city", content: "## Email 1 — Initial\nSubject: A low-hassle option for your {{market_city}} rental\n\nHi {{first_name}},\nI'm {{host_name}}. I rent furnished homes to responsible corporate and traveling-nurse tenants. I handle all management, guarantee rent, and give 30 days notice. Open to a 15-minute call this week?\n\n## Email 2 — Day 4 Follow-Up\nHi {{first_name}}, bumping this up — I know inboxes get full. Would Tuesday or Thursday work for a quick call?\n\n## Email 3 — Day 10 Breakup\nHi {{first_name}}, I'll stop here so I'm not cluttering your inbox. If the timing ever changes, I'm one call away — (555) 555-5555. Wishing you a great tenant either way." },
      { title: "Phone Script", category: "Sourcing", variables: "host_name, market_city", content: "## Phone Script\n\nHi {{first_name}}, this is {{host_name}} — I reached out about your {{market_city}} rental. Do you have 30 seconds? ... I rent furnished to corporate tenants, guarantee the rent, and give 30 days notice. No long-term commitment. Could I ask two questions about the property?" },
      { title: "STR Permission Lease Addendum", category: "Legal", variables: "property_address", content: "## Short-Term Rental Permission Addendum\n\nProperty: {{property_address}}\n\nThe Landlord grants the Tenant written permission to operate short-term/furnished rentals of 30 days or fewer, subject to Tenant maintaining STR liability insurance, a 25+ guest age policy, and noise monitoring. Tenant provides 30 days notice to vacate on landlord request." },
      { title: "LLC & Insurance Checklist", category: "Legal", variables: "host_name", content: "## LLC & Insurance Checklist\n- [ ] Form a separate LLC for arbitrage leases\n- [ ] Obtain EIN\n- [ ] Open business bank account\n- [ ] Renter's insurance\n- [ ] STR-specific liability insurance\n- [ ] Review lease no-subletting clause" },
      { title: "Turnover SOP", category: "Operations", variables: "property_address", content: "## Turnover SOP — {{property_address}}\n\n- 9am & 11am: guest reminders (noon checkout)\n- 12-1pm: cleaner arrives, 10-min walkthrough (lights, thermostat, locks, damage)\n- 1-3pm: deep clean\n- 3-4pm: laundry + damage photos\n- 4pm: smart home reset" },
      { title: "Property P&L Template", category: "Finance", variables: "property_address", content: "## Monthly P&L — {{property_address}}\n**Revenue:** STR income ___ / MTR income ___\n**Costs:** Rent ___ / Utilities ___ / Cleaning & supplies ___ / Platform fees ___ / Maintenance ___ / Management time ___\n**Net operating profit:** ___\n**Tax reserve (25-30%):** ___" },
      { title: "Pricing Calculator", category: "Operations", variables: "all_in_cost", content: "## Pricing\n- Floor price: never below 1.5x all-in monthly cost ({{all_in_cost}})\n- Ceiling: 2-3x standard rental market rate\n- Weekdays: -15%\n- Weekends: +25%\n- 28+ day MTR stays: -10%" },
      { title: "Pre-Arrival Checklist", category: "Operations", variables: "property_address", content: "## Pre-Arrival — {{property_address}}\n- [ ] Smart lock code generated & tested\n- [ ] Thermostat set 68F\n- [ ] Check-in instructions sent\n- [ ] Cleaning confirmed\n- [ ] Supplies stocked" },
      { title: "Turnover Checklist", category: "Operations", variables: "property_address", content: "## Turnover Checklist — {{property_address}}\n- [ ] Lights on\n- [ ] Thermostat 68F\n- [ ] Locks reset\n- [ ] Obvious damage noted\n- [ ] Deep clean done\n- [ ] Laundry started\n- [ ] Damage photos taken\n- [ ] Smart home reset" }
    ];

    const existingDays = await base44.asServiceRole.entities.ProgramDay.list();
    if (existingDays.length === 0) {
      await base44.asServiceRole.entities.ProgramDay.bulkCreate(curriculum);
    }
    const existingTemplates = await base44.asServiceRole.entities.Template.list();
    if (existingTemplates.length === 0) {
      await base44.asServiceRole.entities.Template.bulkCreate(templates);
    }

    return Response.json({
      ok: true,
      days: existingDays.length,
      templates: existingTemplates.length,
      seededDays: existingDays.length === 0 ? curriculum.length : 0,
      seededTemplates: existingTemplates.length === 0 ? templates.length : 0
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}