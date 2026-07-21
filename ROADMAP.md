# Racepicks Roadmap & Vision

This file captures the long-term direction for Racepicks, so future
work (by Jordan, or any AI assistant helping out) stays aligned with
where the app is headed — not just what's immediately in front of us.





## Current State (2026)

- Beta trial running for the 2026 season with ~6 players.
- Covers Supercross, Pro Motocross, and SMX Playoffs.
- Free to play. No money changes hands.
- Picks: 1st / 2nd / 3rd / Wildcard (7th–15th, randomly assigned).

## 2027 Plan: Public Launch

- Open Racepicks to the public for the full 2027 season.
- Same three series (SX, MX, SMX), expecting 50+ players.
- Continue refining based on 2026 beta feedback.

## Future Expansion — More Motocross/Supercross Series

Potential series to add on the same platform:
- MXGP (World Motocross Championship)
- WSX (World Supercross Championship)
- AUS SX (Australian Supercross Championship)
- Australian Pro Motocross Championship (MX Nationals)

**Architecture implication:** the current `series` field on `events`
is free text (`"Supercross"`, `"Motocross"`, `"SMX"`). At 3 series this
works, but adding more series (especially international ones with
different formats) will eventually need a proper `sports` /
`series` relational structure rather than string matching, so picks,
wildcard logic, and scoring can be configured per series instead of
hardcoded.

## Long-Term Vision — Other Motorsports

Potential long-term expansion beyond motocross/supercross entirely:
- Formula 1
- MotoGP
- V8 Supercars / Supercars Championship

**Architecture implication:** these sports likely need different pick
formats entirely (e.g. constructors' picks, sprint race formats) and
possibly a different scoring model than "1st/2nd/3rd/Wildcard." Any
core scoring/picks logic built for SX/MX should avoid assumptions that
only work for those series, where reasonably possible.

## Monetization Ideas (under consideration)

### ⚠️ Legal review required before implementing any of these:
- **Cash buy-in with prize pool payout at season end.**
- **Premium membership with weekly raffles (dirt bike gear prizes).**

Both of these likely fall under Australian lottery/gaming/wagering
regulations (varies by state — NSW, VIC, QLD etc. each have their own
rules, plus federal Interactive Gambling Act considerations). Do NOT
implement cash prize pools or raffles without first getting advice
from a lawyer specializing in Australian gaming/gambling law. This is
the single biggest legal risk in the whole roadmap — bigger than any
technical decision — so it needs to be resolved before real money is
involved, not after.

### Lower-risk options to explore first:
- **Sponsorships** — realistic once there's real traffic/player data
  to show sponsors. Low technical effort (banner/logo placement).
- **Merchandise** (stickers, hats, hoodies) — technically simple via
  Shopify/Printful, but real-world logistics (fulfillment, sizing,
  returns) fall on Jordan personally.
- **Google Ads** — easy to add technically, but only worth meaningful
  revenue once traffic is substantial.
- **Affiliate/referral links** (gear stores, Racer X, etc.) — low
  effort, no legal complexity, fits the existing audience naturally.

## Guiding Principle for Development

When building new features between now and the 2027 public launch,
prefer designs that:
1. Don't hardcode assumptions specific to only Supercross/Motocross/SMX,
   where it's reasonably easy to avoid.
2. Keep scoring, wildcard, and pick-format logic separable/configurable
   per series, rather than baked into one shared function.
3. Assume the player base will scale from ~6 to 50+ to potentially much
   larger — so avoid manual, one-at-a-time admin steps where an
   automated or batch alternative is realistic to build.

_Last updated: 19 July 2026_






## Mobile App (Future — post core-feature stability)

Plan: wrap the existing Next.js site using **Capacitor**, rather than
rebuilding natively. This gets a real App Store / Google Play listing
while reusing the same codebase — no separate app to maintain.

**Process:**
1. Add Capacitor to the existing Next.js project (native iOS/Android
   folders generated inside the repo, pointing at the site).
2. Configure app icon, splash screen, name, permissions.
3. Test via Xcode (iOS) / Android Studio (Android).
4. Set up developer accounts: Apple Developer Program (~$99 USD/year),
   Google Play Console (~$25 USD one-time).
5. Submit for review — Google Play is quick; Apple's review is
   stricter/slower, and can reject apps that feel like "just a
   website wrapper," so the native shell needs to feel sufficiently
   app-like (proper nav, no visible browser chrome) to pass smoothly.

**Timing:** hold off starting this until the core app (features,
scoring, competitions) is more settled — wrapping a moving target
means re-testing the native shell every time something changes.
Good candidate for closer to the 2027 public launch.

**Rough cost estimate:** ~$99/year (Apple) + ~$25 one-time (Google) if
self-managed. If hiring a developer for the Capacitor setup + store
submission process, low hundreds to low thousands of dollars,
depending on who's hired.