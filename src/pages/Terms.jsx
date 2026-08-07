import { Link } from "react-router-dom";
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_EFFECTIVE_DATE, COMPANY } from "@/lib/legal";

export default function Terms() {
  return (
    <div className="min-h-screen bg-brand-ink text-brand-text">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="mb-8 border-b border-brand-line pb-6">
          <h1 className="text-3xl font-bold text-brand-text">Terms &amp; Privacy</h1>
          <p className="text-brand-mutedtext mt-2 text-sm">
            {COMPANY} · Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE}
          </p>
        </div>
        <div className="space-y-8">
          {TERMS_SECTIONS.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-xl font-semibold text-brand-gold">{s.heading}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-brand-mutedtext leading-relaxed text-sm">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-12 text-center border-t border-brand-line pt-6">
          <Link to="/" className="text-brand-gold hover:underline text-sm">Back to the app</Link>
        </div>
      </div>
    </div>
  );
}