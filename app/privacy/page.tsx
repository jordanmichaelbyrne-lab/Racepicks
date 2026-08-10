import Link from "next/link";
import Navbar from "../components/Navbar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Legal
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
            Privacy Policy
          </h1>

          <p className="mt-4 text-sm text-zinc-500">
            Last updated: 10/08/2026
          </p>

          <div className="mt-10 space-y-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 leading-7 text-zinc-300 sm:p-10">
            <section>
              <h2 className="text-2xl font-black text-white">
                1. Who we are
              </h2>
              <p className="mt-3">
                Racepicks (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
                &ldquo;our&rdquo;) operates the Racepicks website and,
                in future, a companion mobile app, providing a
                Supercross, Motocross, and SMX tipping competition to
                players in Australia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                2. Information we collect
              </h2>
              <p className="mt-3">
                <strong>Account information.</strong> When you
                register, we collect your email address and a
                password (stored securely via our authentication
                provider, never visible to us in plain text).
              </p>
              <p className="mt-3">
                <strong>Profile information.</strong> You may
                optionally provide a display name, first name, last
                name, and a profile avatar image.
              </p>
              <p className="mt-3">
                <strong>Competition activity.</strong> We store the
                picks you submit for each event, your competition
                scores and standings, and which events you&apos;ve
                participated in.
              </p>
              <p className="mt-3">
                <strong>Automatically collected information.</strong>{" "}
                We may collect basic technical information such as
                your IP address, browser type, and device information,
                for security and diagnostic purposes.
              </p>
              <p className="mt-3">
                We do not currently collect payment information. If a
                paid feature is introduced in future, this policy will
                be updated.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                3. How we use your information
              </h2>
              <p className="mt-3">
                We use your information to create and manage your
                account, operate the competition, send you
                competition-related emails, maintain the security and
                integrity of the Service, and improve and troubleshoot
                the Service. We do not sell your personal information
                to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                4. Email communications
              </h2>
              <p className="mt-3">
                By registering, you agree to receive
                competition-related emails (picks reminders, results,
                rider withdrawal alerts). These are considered part of
                the core Service and not optional marketing. Every
                email we send includes a way to contact us to manage
                your notification preferences. We use a third-party
                email delivery provider (Resend) to send these emails.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                5. Third-party service providers
              </h2>
              <p className="mt-3">
                We use the following third-party providers to operate
                Racepicks. Each processes limited data on our behalf,
                under their own privacy and security practices:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong>Supabase</strong> &mdash; authentication and
                  database hosting (stores your account, profile, and
                  picks data).
                </li>
                <li>
                  <strong>Resend</strong> &mdash; transactional email
                  delivery.
                </li>
                <li>
                  <strong>Vercel</strong> &mdash; website hosting and
                  infrastructure.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                6. Data storage and security
              </h2>
              <p className="mt-3">
                Your data is stored on servers operated by our
                infrastructure providers, which may be located outside
                Australia. We take reasonable steps to protect your
                information from misuse, loss, and unauthorised
                access, but no method of electronic storage is 100%
                secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                7. Your rights
              </h2>
              <p className="mt-3">
                You can access and update most of your profile
                information directly through your account settings.
                You can request deletion of your account and
                associated personal data at any time via your account
                settings, or by contacting us directly. Under the
                Australian Privacy Principles (Privacy Act 1988), you
                have the right to request access to the personal
                information we hold about you, and to request
                correction of inaccurate information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                8. Children&apos;s privacy
              </h2>
              <p className="mt-3">
                Racepicks is not intended for use by anyone under the
                age of 16, consistent with our{" "}
                <Link
                  href="/terms"
                  className="font-bold text-orange-500 hover:text-orange-400"
                >
                  Terms and Conditions
                </Link>
                . We do not knowingly collect personal information
                from anyone under 16.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                9. Cookies
              </h2>
              <p className="mt-3">
                We use limited cookies necessary for authentication
                (keeping you logged in) and basic site functionality.
                We do not currently use cookies for advertising or
                third-party tracking purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                10. Changes to this policy
              </h2>
              <p className="mt-3">
                We may update this Privacy Policy from time to time.
                Material changes will be communicated to registered
                players by email where reasonably practicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                11. Contact us
              </h2>
              <p className="mt-3">
                For any questions about this Privacy Policy, or to
                exercise your rights under Section 7, contact us at{" "}
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