// Small helper used anywhere we loop over multiple players and send an
// email to each one. Resend allows a maximum of 10 requests per second —
// without a delay between sends, a loop over more than ~10 players can
// fire requests faster than that limit, causing some emails to be
// silently rejected (429 rate_limit_exceeded) partway through the loop.
//
// 150ms between sends keeps us comfortably under 10/sec (which would be
// ~100ms apart at the theoretical maximum) with a safety margin, and
// scales fine even as the player base grows well beyond today's numbers.

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const EMAIL_SEND_DELAY_MS = 150;