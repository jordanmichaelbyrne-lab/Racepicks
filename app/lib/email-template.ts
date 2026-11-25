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

type EmailTemplateOptions = {
  bodyHtml: string;
  // Big white title under the logo, e.g. "Picks are open".
  headline?: string;
  // Small orange label above the headline, e.g. "2027 Supercross · Round 1".
  eyebrow?: string;
  ctaText?: string;
  ctaHref?: string;
  preheaderText?: string;
  // Optional line in the footer explaining why the email was sent.
  footerNote?: string;
};

const SITE_URL = "https://www.mxgatepicks.com";
const LOGO_URL = `${SITE_URL}/images/logos/MXGatepicks-Trans.png`;

// Player-supplied text (like display names) must be escaped before it is
// placed inside email HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Dark rounded box for lists and highlights inside an email body.
export function emailInfoCard(innerHtml: string): string {
  return `<div style="background-color:#111113;border:1px solid #27272a;border-radius:14px;padding:20px 24px;margin:6px 0 16px 0;text-align:left;line-height:1.9;color:#ffffff;">${innerHtml}</div>`;
}

// Orange-edged box for "pay attention to this" messages.
export function emailCallout(innerHtml: string): string {
  return `<div style="background-color:#1c1109;border:1px solid #7c3a0e;border-left:4px solid #f97316;border-radius:12px;padding:16px 20px;margin:6px 0 16px 0;text-align:left;font-weight:700;color:#fed7aa;">${innerHtml}</div>`;
}

// The "Picks close ..." block used by the reminder emails.
export function emailPicksClose(closeTimeLabel: string): string {
  return `<p style="margin:0;">Picks close<br /><strong style="color:#ffffff;font-size:18px;">${closeTimeLabel}</strong><br /><span style="color:#71717a;font-size:13px;">Brisbane time</span></p>`;
}

export function wrapEmailHtml({
  bodyHtml,
  headline,
  eyebrow,
  ctaText,
  ctaHref,
  preheaderText,
  footerNote,
}: EmailTemplateOptions): string {
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

  const ctaRow =
    ctaText && ctaHref
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
    ${
      preheaderText
        ? `<div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText}</div>`
        : ""
    }
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
export const standardEmailHeaders = {
  "List-Unsubscribe": "<mailto:unsubscribe@mxgatepicks.com?subject=Unsubscribe>",
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};