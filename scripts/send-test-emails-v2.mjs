// scripts/send-test-emails.mjs
//
// One-off test script — sends every Racepicks email template to a single
// address so you can eyeball formatting in a real inbox before wiring the
// cron routes live.
//
// Usage (from your project root, in the terminal):
//   node scripts/send-test-emails.mjs your@email.com
//
// Note: this duplicates the branded template (wrapEmailHtml) from
// app/lib/email-template.ts, since this script runs standalone via plain
// Node (not through Next's TypeScript build). If you ever tweak the
// branding in email-template.ts, update the copy below to match.

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

function wrapEmailHtml({ bodyHtml, ctaText, ctaHref, preheaderText }) {
  const ctaButton =
    ctaText && ctaHref
      ? `
        <a href="${ctaHref}"
           style="display:inline-block;background:#f97316;color:#000000;text-decoration:none;
                  padding:12px 24px;border-radius:6px;font-weight:700;margin-top:8px;
                  font-family:Arial,Helvetica,sans-serif;font-size:15px;">
          ${ctaText}
        </a>`
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f4;">
    ${
      preheaderText
        ? `<div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#000000;padding:24px 32px;">
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">
                  Racepicks<span style="color:#f97316;">.</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222;">
                ${bodyHtml}
                ${ctaButton}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#fafafa;font-size:12px;color:#999999;
                         border-top:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;">
                Racepicks &middot; Australia's Supercross, Motocross &amp; SMX tipping competition.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const eventLabel = "2026 Motocross · Round 8 · Washougal";
const closeTimeLabel = "Saturday, 25 July 2026, 10:00 pm (Brisbane time)";

const emails = [
  {
    subject: "[TEST] Picks are open — Washougal",
    bodyHtml: `
      <p>Hi Jordan,</p>
      <p>Picks are now open for <strong>${eventLabel}</strong>.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
    `,
    ctaText: "Enter Your Picks",
    ctaHref: "https://racepicks.app/picks",
  },
  {
    subject: "[TEST] Final chance — picks close soon for Washougal",
    bodyHtml: `
      <p>Hi Jordan,</p>
      <p>You haven't entered your picks yet for <strong>${eventLabel}</strong>.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
    `,
    ctaText: "Enter Your Picks Now",
    ctaHref: "https://racepicks.app/picks",
  },
  {
    subject: "[TEST] Picks close in 6 hours — Washougal",
    bodyHtml: `
      <p>Hi Jordan,</p>
      <p>Picks close in around <strong>6 hours</strong> for <strong>${eventLabel}</strong> — you haven't entered yours yet.</p>
      <p>Picks close: <strong>${closeTimeLabel}</strong></p>
    `,
    ctaText: "Enter Your Picks Now",
    ctaHref: "https://racepicks.app/picks",
  },
  {
    subject: "[TEST] Results are in — Washougal",
    bodyHtml: `
      <p>Hi Jordan,</p>
      <p>The official results are in for <strong>${eventLabel}</strong>:</p>
      <div style="background-color:#f7f7f7;border-radius:6px;padding:16px 20px;margin:16px 0;line-height:1.9;">
        🥇 1st: <strong>Jett Lawrence</strong><br/>
        🥈 2nd: <strong>Chase Sexton</strong><br/>
        🥉 3rd: <strong>Hunter Lawrence</strong><br/>
        ⭐ Wildcard: <strong>Justin Cooper</strong>
      </div>
      <p>Check the leaderboard to see how your picks scored:</p>
    `,
    ctaText: "View the Leaderboard",
    ctaHref: "https://racepicks.app/leaderboard",
  },
  {
    subject: "[TEST] Action needed: your rider is no longer entered — Washougal",
    bodyHtml: `
      <p>Hi Jordan,</p>
      <p>The entry list for <strong>${eventLabel}</strong> has just been updated, and the following rider you picked is no longer entered:</p>
      <p style="background-color:#fff4e8;border-left:3px solid #f97316;padding:10px 16px;font-weight:700;">Eli Tomac</p>
      <p>Please update your picks before Saturday 10PM so they count toward this round.</p>
    `,
    ctaText: "Update Your Picks",
    ctaHref: "https://racepicks.app/picks",
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
        html: wrapEmailHtml(email),
      });
      console.log(`✓ Sent: ${email.subject}`);
    } catch (err) {
      console.error(`✗ Failed: ${email.subject}`, err);
    }
  }

  console.log("\nDone. Check your inbox (and spam folder, just in case).");
};

run();
