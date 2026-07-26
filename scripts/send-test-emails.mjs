// scripts/send-test-emails.mjs
//
// One-off test script — sends every Racepicks email template to a single
// address so you can eyeball formatting in a real inbox before wiring the
// cron routes live.
//
// Usage (from your project root, in the terminal):
//   node scripts/send-test-emails.mjs your@email.com
//
// This reads RESEND_API_KEY from your .env.local automatically (via
// @next/env, which ships with Next.js — no extra install needed).
// It does NOT touch Supabase or real player data — everything here is
// sample/placeholder content, same as the wording we previewed earlier.

import nextEnv from "@next/env";
import { Resend } from "resend";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error(
    "Please provide an email address, e.g:\n  node scripts/send-test-emails.mjs your@email.com"
  );
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error(
    "RESEND_API_KEY not found. Make sure it's set in .env.local."
  );
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

const eventLabel = "2026 Motocross · Round 8 · Washougal";
const closeTimeLabel = "Saturday, 25 July 2026, 10:00 pm (Brisbane time)";

const emails = [
  {
    subject: "[TEST] Picks are open — Washougal",
    html: `
      <p>Hi Jordan,</p>
      <p>Picks are now open for <strong>${eventLabel}</strong>.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
      <p><a href="https://racepicks.app/picks">Enter your picks</a></p>
      <p>— Racepicks</p>
    `,
  },
  {
    subject: "[TEST] Final chance — picks close soon for Washougal",
    html: `
      <p>Hi Jordan,</p>
      <p>You haven't entered your picks yet for <strong>${eventLabel}</strong>.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
      <p><a href="https://racepicks.app/picks">Enter your picks now</a></p>
      <p>— Racepicks</p>
    `,
  },
  {
    subject: "[TEST] Picks close in 6 hours — Washougal",
    html: `
      <p>Hi Jordan,</p>
      <p>Picks close in around <strong>6 hours</strong> for <strong>${eventLabel}</strong> — you haven't entered yours yet.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
      <p><a href="https://racepicks.app/picks">Enter your picks now</a></p>
      <p>— Racepicks</p>
    `,
  },
  {
    subject: "[TEST] Results are in — Washougal",
    html: `
      <p>Hi Jordan,</p>
      <p>The official results are in for <strong>${eventLabel}</strong>:</p>
      <p>
        🥇 1st: <strong>Jett Lawrence</strong><br/>
        🥈 2nd: <strong>Chase Sexton</strong><br/>
        🥉 3rd: <strong>Hunter Lawrence</strong><br/>
        ⭐ Wildcard: <strong>Justin Cooper</strong>
      </p>
      <p><a href="https://racepicks.app/leaderboard">View the Leaderboard</a></p>
      <p>— Racepicks</p>
    `,
  },
  {
    subject: "[TEST] Action needed: your rider is no longer entered — Washougal",
    html: `
      <p>Hi Jordan,</p>
      <p>The entry list for <strong>${eventLabel}</strong> has just been updated, and the following rider you picked is no longer entered:</p>
      <p><strong>Eli Tomac</strong></p>
      <p>Please update your picks before Saturday 10PM so they count toward this round.</p>
      <p><a href="https://racepicks.app/picks">Update your picks</a></p>
      <p>— Racepicks</p>
    `,
  },
];

const run = async () => {
  console.log(`Sending ${emails.length} test emails to ${targetEmail}...\n`);

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: targetEmail,
        subject: email.subject,
        html: email.html,
      });
      console.log(`✓ Sent: ${email.subject}`);
    } catch (err) {
      console.error(`✗ Failed: ${email.subject}`, err);
    }
  }

  console.log("\nDone. Check your inbox (and spam folder, just in case).");
};

run();
