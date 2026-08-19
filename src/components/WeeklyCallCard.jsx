import { Card, CardContent } from "@/components/ui/card";
import { Video, ArrowRight } from "lucide-react";

/**
 * Weekly coaching call prep.
 *
 * The sprint includes one 30-minute call per week. Thirty minutes is not much,
 * and it evaporates if it opens with "so where are you at?" This card turns
 * each week's own numbers into the two or three things worth spending the call
 * on, so the host arrives with an agenda instead of a status update.
 *
 * The booking link is configured once by staff (see src/lib/app-params.js).
 * When it is absent the card still renders the agenda — the prep is the value,
 * the link is a convenience.
 */

const AGENDAS = {
  1: {
    focus: "Market and buy box",
    bring: [
      "Your composite score for each market you ran — and which one you're committing to",
      "Any regulation finding that surprised you (screenshot the source)",
      "The buy box line you're least sure about"
    ],
    decide: "Which single market you pitch in. Two markets is not focus, it's hedging."
  },
  2: {
    focus: "Pitch and pipeline",
    bring: [
      "Your landlord value prop, in your own words",
      "Outreach count so far, and how many replied",
      "The objection you handled worst in the mock drill"
    ],
    decide: "Whether your open needs rewriting before you send the next twenty."
  },
  3: {
    focus: "Underwriting and terms",
    bring: [
      "Your two strongest deals and their verdicts",
      "Any deal where cash profit passed but true profit didn't",
      "Your draft term sheet — especially the repair-response window"
    ],
    decide: "Which property you push to a written permission conversation this week."
  },
  4: {
    focus: "Close or convert",
    bring: [
      "Where each live conversation actually stands",
      "Anything the landlord asked for that you haven't answered yet",
      "Your signed-lease blockers, named specifically"
    ],
    decide: "The exact next sentence you say to your warmest landlord."
  }
};

export default function WeeklyCallCard({ week, bookingUrl }) {
  const agenda = AGENDAS[week];
  if (!agenda) return null;

  return (
    <Card className="border-brand-line">
      <CardContent className="py-5">
        <div className="flex items-center gap-2 mb-1">
          <Video className="w-4 h-4 text-brand-gold" />
          <div className="text-sm font-semibold text-brand-text">Week {week} call — {agenda.focus}</div>
        </div>
        <p className="text-xs text-brand-mutedtext mb-3">
          Thirty minutes goes fast. Walk in with these and we spend it deciding, not catching up.
        </p>

        <div className="text-[10px] uppercase tracking-wide text-brand-mutedtext mb-1">Bring</div>
        <ul className="space-y-1 mb-3">
          {agenda.bring.map((b, i) => (
            <li key={i} className="text-xs text-brand-mutedtext flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">·</span>{b}
            </li>
          ))}
        </ul>

        <div className="p-2.5 rounded-lg bg-brand-raised border border-brand-line mb-3">
          <div className="text-[10px] uppercase tracking-wide text-brand-mutedtext mb-0.5">We decide</div>
          <p className="text-xs text-brand-text">{agenda.decide}</p>
        </div>

        {bookingUrl ? (
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline">
            Book this week's call <ArrowRight className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-xs text-brand-mutedtext italic">
            Your coach will send the booking link for this week's call.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
