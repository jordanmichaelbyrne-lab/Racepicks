import Link from "next/link";
import Navbar from "../components/Navbar";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Legal
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
            Terms &amp; Conditions
          </h1>

          <p className="mt-4 text-sm text-zinc-500">
            Last updated: 10/08/2026
          </p>

          <div className="mt-10 space-y-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 leading-7 text-zinc-300 sm:p-10">
            <section>
              <h2 className="text-2xl font-black text-white">
                1. Acceptance of these terms
              </h2>
              <p className="mt-3">
                By creating an account or participating in any
                competition on Racepicks (&ldquo;the Service&rdquo;,
                &ldquo;we&rdquo;, &ldquo;us&rdquo;,
                &ldquo;our&rdquo;), you agree to be bound by these
                Terms and Conditions. If you do not agree, please do
                not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                2. Eligibility
              </h2>
              <p className="mt-3">
                You must be at least <strong>16 years of age</strong>{" "}
                to create an account or participate in Racepicks. By
                registering, you confirm that the information you
                provide is accurate. We reserve the right to refuse
                registration, or to suspend or terminate an existing
                account, at our discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                3. Description of the service
              </h2>
              <p className="mt-3">
                Racepicks is a prediction (&ldquo;tipping&rdquo;)
                competition covering Supercross, Motocross, and SMX
                events. Players submit predictions for race outcomes
                (1st, 2nd, 3rd, and a randomly assigned
                &ldquo;Wildcard&rdquo; position) ahead of each event.
                Racepicks is currently offered free of charge to
                enter. We do not guarantee the accuracy, completeness,
                or timeliness of entry lists, results, or scoring at
                any point before, during, or after an event.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                4. Competition rules
              </h2>
              <p className="mt-3">
                Picks must be submitted before the applicable
                picks-close deadline shown for each event. Late
                submissions will not be accepted or scored. If a rider
                you have picked withdraws or is otherwise removed from
                the confirmed entry list after you have submitted your
                picks, you are responsible for updating your picks
                before the deadline &mdash; email notifications are a
                courtesy, not a guarantee, and do not extend the
                deadline. Scoring is calculated based on official race
                results; in the event of a discrepancy, official
                results take precedence. We reserve the right to
                correct scoring errors at any time. Any decision we
                make regarding the interpretation of these rules,
                scoring disputes, or eligibility is final.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                5. Prizes (if applicable)
              </h2>
              <p className="mt-3">
                Where a prize is offered for a competition or season,
                the specific prize, its value, and any conditions of
                claiming it will be described separately at the time
                the prize is announced. Entry to Racepicks is free
                &mdash; no purchase, payment, or entry fee is required
                to participate in or win any prize offered. Prize
                winners are determined based on final competition
                standings, subject to Section 4. We reserve the right
                to substitute a prize of equivalent value, or withhold
                a prize where we reasonably suspect fraudulent
                activity or rule violations. Prizes are not
                transferable or redeemable for cash unless stated
                otherwise at the time the prize is announced.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                6. Account conduct
              </h2>
              <p className="mt-3">
                You are responsible for maintaining the confidentiality
                of your account credentials. You agree not to create
                multiple accounts to gain an unfair advantage, attempt
                to manipulate or exploit the scoring or entry-list
                system, harass or disrupt other players, or attempt to
                gain unauthorised access to the Service. We reserve
                the right to suspend or terminate any account that we
                reasonably believe violates these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                7. Intellectual property and third-party content
              </h2>
              <p className="mt-3">
                Racepicks is not affiliated with, endorsed by, or
                sponsored by AMA Pro Motocross, Monster Energy
                Supercross, SuperMotocross (SMX), Racer X, or any
                rider, team, or manufacturer referenced on the
                Service. Rider, team, and manufacturer names displayed
                on Racepicks are used for identification purposes
                only, in connection with publicly available entry and
                results information. All Racepicks branding, design,
                and original content is owned by us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                8. Limitation of liability
              </h2>
              <p className="mt-3">
                To the maximum extent permitted by law, Racepicks is
                provided &ldquo;as is&rdquo; without warranties of any
                kind. We are not liable for loss or damage arising
                from inaccurate or delayed entry-list or results data,
                downtime or technical errors, decisions made based on
                information displayed on the Service, or loss of
                account access. Nothing in these terms excludes,
                restricts, or modifies any consumer guarantee that
                cannot lawfully be excluded under the Australian
                Consumer Law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                9. Changes to these terms
              </h2>
              <p className="mt-3">
                We may update these terms from time to time. Continued
                use of the Service after changes are published
                constitutes acceptance of the updated terms. Material
                changes will be communicated to registered players by
                email where reasonably practicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                10. Privacy
              </h2>
              <p className="mt-3">
                Our collection and use of your personal information is
                described in our{" "}
                <Link
                  href="/privacy"
                  className="font-bold text-orange-500 hover:text-orange-400"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                11. Governing law
              </h2>
              <p className="mt-3">
                These terms are governed by the laws of{" "}
                <strong>Queensland, Australia</strong>, and any
                disputes will be subject to the exclusive jurisdiction
                of the courts of Queensland.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                12. Contact
              </h2>
              <p className="mt-3">
                Questions about these terms can be sent to{" "}
                <strong>support@racepicks.app</strong>.
              </p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/workshop"
              className="inline-flex items-center gap-2 font-black text-zinc-400 transition hover:text-orange-500"
            >
              <span>←</span>
              <span>Back to Workshop</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}