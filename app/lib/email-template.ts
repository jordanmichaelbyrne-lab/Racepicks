// Shared branded email wrapper — every Racepicks email should be built
// with this, so all notifications stay visually consistent in one place.
//
// Email clients (Gmail, Outlook, Apple Mail) render HTML inconsistently,
// so this uses table-based layout and inline styles throughout rather
// than a <style> block or Tailwind classes — that's standard practice
// for HTML email, not a step backwards from the rest of the app.

type EmailTemplateOptions = {
  bodyHtml: string;
  ctaText?: string;
  ctaHref?: string;
  preheaderText?: string;
};

export function wrapEmailHtml({
  bodyHtml,
  ctaText,
  ctaHref,
  preheaderText,
}: EmailTemplateOptions): string {
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
                <br />
                <a href="mailto:unsubscribe@racepicks.app?subject=Unsubscribe"
                   style="color:#999999;text-decoration:underline;">
                  Manage notification preferences
                </a>
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
  "List-Unsubscribe": "<mailto:unsubscribe@racepicks.app?subject=Unsubscribe>",
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};