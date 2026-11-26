// scripts/send-rebrand-email.mjs
//
// One-off script: emails every existing player to tell them Racepicks is
// now MX Gatepicks (new address, log in again, nothing lost).
//
// THREE MODES (run from your project root, in the terminal):
//
//   1. Practice run: only LISTS who would be emailed. Sends nothing.
//        node scripts/send-rebrand-email.mjs
//
//   2. Test: sends ONE copy to the address you give, so you can see
//      exactly what players will get.
//        node scripts/send-rebrand-email.mjs --test you@example.com
//
//   3. Real send: emails every player.
//        node scripts/send-rebrand-email.mjs --send
//
// Safety: every address that gets an email is written to
// rebrand-email-sent.json in the project folder. If you run --send again
// (after an error, say) people already emailed are skipped, so nobody gets
// it twice. Delete that file only if you really want to send to everyone
// again.

import fs from "node:fs";
import nextEnv from "@next/env";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const SUBJECT = "Racepicks is now MX Gatepicks \u{1F3C1}";
const SENT_LOG = "rebrand-email-sent.json";

const args = process.argv.slice(2);
const testIndex = args.indexOf("--test");
const testEmail = testIndex >= 0 ? args[testIndex + 1] : null;
const isSend = args.includes("--send");

if (testIndex >= 0 && (!testEmail || testEmail.startsWith("--"))) {
  console.error("Please give an email address, e.g:\n  node scripts/send-rebrand-email.mjs --test you@example.com");
  process.exit(1);
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY not found. Make sure it's set in .env.local.");
  process.exit(1);
}

if (!testEmail && (!supabaseUrl || !serviceKey)) {
  console.error(
    "Could not find the Supabase settings in .env.local.\n" +
      "Looked for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Open app/lib/supabase/admin.ts to see what your project calls them,\n" +
      "and tell me the names."
  );
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------- Copy of app/lib/email-template.ts (types removed) ----------
// Shared branded email wrapper — every MX Gatepicks email should be built
// with this, so all notifications stay visually consistent in one place.
//
// Email clients (Gmail, Outlook, Apple Mail) render HTML inconsistently,
// so this uses table-based layout and inline styles throughout rather
// than a <style> block or Tailwind classes — that's standard practice
// for HTML email, not a step backwards from the rest of the app.
//
// Look: full black screen, centred logo, orange accent, big white
// headline, grey body text and an orange pill button.
const SITE_URL = "https://www.mxgatepicks.com";
const LOGO_URL = `${SITE_URL}/images/logos/MXGatepicks-Trans.png`;
// Player-supplied text (like display names) must be escaped before it is
// placed inside email HTML.
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
// Dark rounded box for lists and highlights inside an email body.
function emailInfoCard(innerHtml) {
    return `<div style="background-color:#111113;border:1px solid #27272a;border-radius:14px;padding:20px 24px;margin:6px 0 16px 0;text-align:left;line-height:1.9;color:#ffffff;">${innerHtml}</div>`;
}
// Orange-edged box for "pay attention to this" messages.
function emailCallout(innerHtml) {
    return `<div style="background-color:#1c1109;border:1px solid #7c3a0e;border-left:4px solid #f97316;border-radius:12px;padding:16px 20px;margin:6px 0 16px 0;text-align:left;font-weight:700;color:#fed7aa;">${innerHtml}</div>`;
}
// The "Picks close ..." block used by the reminder emails.
function emailPicksClose(closeTimeLabel) {
    return `<p style="margin:0;">Picks close<br /><strong style="color:#ffffff;font-size:18px;">${closeTimeLabel}</strong><br /><span style="color:#71717a;font-size:13px;">Brisbane time</span></p>`;
}
function wrapEmailHtml({ bodyHtml, headline, eyebrow, ctaText, ctaHref, preheaderText, footerNote, }) {
    // Plain <p> and <strong> tags in a body get the dark-theme styling here,
    // so callers don't need to repeat inline styles on every paragraph.
    const styledBody = bodyHtml
        .replace(/<p>/g, '<p style="margin:0 0 16px 0;">')
        .replace(/<strong>/g, '<strong style="color:#ffffff;">');
    const eyebrowRow = eyebrow
        ? `
    <tr>
      <td align="center" style="padding:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#f97316;">
        ${eyebrow}
      </td>
    </tr>`
        : "";
    const headlineRow = headline
        ? `
    <tr>
      <td align="center" style="padding:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.15;font-weight:900;color:#ffffff;">
        ${headline}
      </td>
    </tr>`
        : "";
    const ctaRow = ctaText && ctaHref
        ? `
    <tr>
      <td align="center" style="padding:8px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#f97316" style="border-radius:999px;">
              <a href="${ctaHref}"
                 style="display:inline-block;padding:16px 40px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:999px;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
        : "";
    const footerNoteHtml = footerNote ? `${footerNote}<br />` : "";
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
  </head>
  <body style="margin:0;padding:0;background-color:#000000;">
    ${preheaderText
        ? `<div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText}</div>`
        : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000;">
      <tr>
        <td align="center" style="padding:44px 16px 40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td align="center" style="padding:0 0 28px 0;">
                <a href="${SITE_URL}" style="text-decoration:none;">
                  <img src="${LOGO_URL}" width="260" alt="MX GATEPICKS." style="display:block;width:260px;max-width:100%;height:auto;border:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:900;color:#ffffff;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 0 34px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="56" height="3" bgcolor="#f97316" style="font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>${eyebrowRow}${headlineRow}
            <tr>
              <td align="center" style="padding:0 0 30px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#d4d4d8;">
                ${styledBody}
              </td>
            </tr>${ctaRow}
            <tr>
              <td style="padding:44px 0 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="1" bgcolor="#27272a" style="font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:26px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#71717a;">
                <strong style="color:#a1a1aa;">MX Gatepicks.</strong><br />
                Australia&#39;s Supercross, Motocross &amp; SMX tipping competition.<br /><br />
                ${footerNoteHtml}
                <a href="${SITE_URL}" style="color:#a1a1aa;text-decoration:underline;">mxgatepicks.com</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:support@mxgatepicks.com" style="color:#a1a1aa;text-decoration:underline;">Support</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:unsubscribe@mxgatepicks.com?subject=Unsubscribe" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
// Standard headers to attach to every outgoing Resend email. Passing a
// real List-Unsubscribe header is a well-documented signal to Outlook,
// Gmail, and other providers that this is a legitimate, well-behaved
// sender — even for transactional-style emails like these, having zero
// unsubscribe mechanism can itself contribute to junk-folder routing.
const standardEmailHeaders = {
    "List-Unsubscribe": "<mailto:unsubscribe@mxgatepicks.com?subject=Unsubscribe>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};

// ---------- The announcement ----------

function buildEmail(displayName) {
  const bodyHtml = `
    <p>Hi ${escapeHtml(displayName || "there")},</p>
    <p>
      Racepicks has a new name. Same game, same leaderboard, same mates to
      beat. We're now <strong>MX Gatepicks</strong>, and the gate is open to
      everyone for the 2027 season.
    </p>
    ${emailInfoCard(
      `<strong>What you need to do</strong><br />Log in again at <strong>mxgatepicks.com</strong>. Use the same email and password as before.<br /><br /><strong>What stays the same</strong><br />All your picks, points and leaderboard positions are exactly where you left them.<br /><br /><strong>Forgot your password?</strong><br />There's now a "Forgot password?" link on the login page.`
    )}
    <p>
      MX Gatepicks is free to play for the whole 2027 season. Know someone
      who reckons they can out-pick you? Send them the link.
    </p>
  `;

  return wrapEmailHtml({
    headline: "Racepicks is now MX Gatepicks",
    eyebrow: "Big news",
    bodyHtml,
    ctaText: "Log In to MX Gatepicks",
    ctaHref: "https://www.mxgatepicks.com/login",
    preheaderText: "Same game, new name. Log in again at mxgatepicks.com.",
    footerNote:
      "You're receiving this because you have a MX Gatepicks (formerly Racepicks) account.",
  });
}

async function sendOne(to, displayName) {
  const result = await resend.emails.send({
    from: "MX Gatepicks <notifications@mxgatepicks.com>",
    to,
    subject: SUBJECT,
    html: buildEmail(displayName),
    headers: standardEmailHeaders,
  });
  if (result.error) {
    throw new Error(result.error.message || JSON.stringify(result.error));
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  // Mode 2: one test email, no database needed.
  if (testEmail) {
    console.log(`Sending ONE test email to ${testEmail}...`);
    try {
      await sendOne(testEmail, "Jordan");
      console.log("\u2713 Sent. Check your inbox (and spam).");
    } catch (err) {
      console.error("\u2717 Failed:", err.message);
    }
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .not("email", "is", null);

  if (error) {
    console.error("Could not load players:", error.message);
    process.exit(1);
  }

  const players = (data ?? []).filter((p) => p.email);

  let alreadySent = [];
  if (fs.existsSync(SENT_LOG)) {
    try {
      alreadySent = JSON.parse(fs.readFileSync(SENT_LOG, "utf8"));
    } catch {
      alreadySent = [];
    }
  }
  const sentSet = new Set(alreadySent.map((e) => e.toLowerCase()));
  const todo = players.filter((p) => !sentSet.has(p.email.toLowerCase()));

  console.log(`Players with an email address: ${players.length}`);
  console.log(`Already emailed (from ${SENT_LOG}): ${players.length - todo.length}`);
  console.log(`Still to email: ${todo.length}\n`);

  // Mode 1: practice run.
  if (!isSend) {
    for (const p of todo) {
      console.log(` - ${p.display_name ?? "(no name)"}  <${p.email}>`);
    }
    console.log(
      "\nPRACTICE RUN ONLY. Nothing was sent.\n" +
        "To email these players for real, run:\n  node scripts/send-rebrand-email.mjs --send"
    );
    return;
  }

  // Mode 3: real send.
  let sent = 0;
  let failed = 0;

  for (const p of todo) {
    try {
      await sendOne(p.email, p.display_name);
      sent += 1;
      alreadySent.push(p.email);
      fs.writeFileSync(SENT_LOG, JSON.stringify(alreadySent, null, 2));
      console.log(`\u2713 Sent: ${p.email}`);
    } catch (err) {
      failed += 1;
      console.error(`\u2717 Failed: ${p.email} \u2014 ${err.message}`);
    }
    // Stay under Resend's 10 requests/second limit.
    await wait(600);
  }

  console.log(`\nDone. Sent: ${sent}. Failed: ${failed}.`);
  if (failed > 0) {
    console.log("Run the same command again to retry only the failed ones.");
  }
}

run();