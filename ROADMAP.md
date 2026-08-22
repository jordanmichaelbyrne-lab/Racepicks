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





## New Landing Page — Championship Selector (Planned for pre-Nov-2027 launch)

Build a new top-level landing page at `/` that lets visitors choose
which championship to engage with, rather than landing straight into
the SX/MX/SMX app.

**Structure decided:**
- New landing page becomes the site's root (`/`).
- The current homepage/app (Washougal hero, countdown, picks, etc.)
  moves to its own path — e.g. `/supercross-motocross`. All internal
  links currently pointing to `/` will need updating to the new path.
- Logged-in existing players should skip the selector and go straight
  to their existing SX/MX/SMX view — don't force an extra click for
  people who've already "chosen."

**Tiles to show:**
- SX + MX + SMX (450 Class) — live, links straight into the existing app.
- 250 Class — Coming Soon (not being built for 2027 season).
- MXGP — Coming Soon
- WSX — Coming Soon
- AUS SX — Coming Soon
- AUS Pro MX — Coming Soon

**Coming Soon tile behaviour:** clicking one opens a simple "Get
notified when this launches" email capture — doubles as a genuine
signal of demand for which series to prioritize building next.
Needs a new small table (e.g. `series_interest_registrations`:
email, series name, created_at) — doesn't need auth, just an email
capture for anyone (signed in or not).

**Implementation notes for when this gets built:**
- Careful with the homepage move — check every internal `<Link href="/">`
  across the app (Navbar, MobileBottomNav, redirects, etc.) and update
  to the new path.
- Consider a redirect from old bookmarked/shared `/` links if this
  matters for SEO or existing shared links.




## Future — "Team Manager" Pro Mode (Post-2027 Launch, Not Yet Committed)
 
A much larger, deeper game mode explored in concept only (Aug 2026) —
captured here so the idea isn't lost, without committing engineering
time to it before the core Racepicks product has had its public
launch and proven itself at scale.
 
### The core idea
 
A second, separate competition sitting *alongside* the existing
Championship — not a replacement, and not something that takes
anything away from free players. Pro subscribers keep playing the
normal Championship exactly as-is, and additionally get access to a
deeper fantasy-team competition with its own leaderboard and
(potentially) its own funded prize pool.
 
**Team Manager, in short:**
- Player becomes a "team manager," builds a fictional factory team
  under a salary cap (e.g. $25M budget across 4–5 riders).
  Rider "values" are based on expected/actual performance.
- Team must include at least one mandatory **privateer** rider —
  forces real field knowledge, not just picking the four favourites.
- Scoring goes well beyond 1st/2nd/3rd: bonus categories (holeshot,
  fastest lap, positions gained, privateer podium/top 10), and for
  Motocross specifically, moto-by-moto scoring (two motos + overall).
- Limited transfers per season, injury replacement mechanics, and
  optional deeper systems (manufacturer "development," a "Team
  Leader" bonus-multiplier token used strategically).
- Multiple leaderboards possible: overall Team Championship, Factory
  Championship (manufacturer bragging rights), Privateer Cup.
- Everyone gets identical budget/rules regardless of what they pay —
  the subscription buys **entry into the competition**, not an
  advantage. Important for credibility.
### Why this is parked, not scheduled
 
This is realistically a second product, not a feature:
- The rider valuation system alone (assigning and updating fair
  dollar values every round) is a substantial ongoing build/admin
  burden on its own — plausibly bigger than everything built in
  Racepicks so far.
- Racepicks hasn't had its public 2027 launch yet, and is still a
  6-player private beta. Building this now risks pulling focus from
  finishing and proving the core product.
- **Legal risk compounds significantly** if this involves a recurring
  paid subscription funding an ongoing cash prize pool — this is a
  meaningfully bigger regulatory question than the single free-entry
  prize already flagged elsewhere in this document, and should not be
  pursued without dedicated legal advice specific to recurring paid
  competitions, on top of the existing prize-pool legal review.
### Suggested validation step, before any build work
 
Before committing engineering time: build a simple **Pro waitlist
landing page** once the 2027 public launch is live, describing the
Team Manager concept at a high level, with an "Interested / Not
Interested" poll or an email-capture "notify me if this launches."
This is a cheap, honest way to gauge real audience appetite before
investing in something this size — same pattern already planned for
gauging interest in new series tiles (see Championship Selector
section above), just applied to a product idea instead of a series.
 
### If this is ever revisited
 
Design the database so Team Manager scoring stays completely
separate from the existing Championship — a new `team_scores` table
(and related tables like `fantasy_teams`, `team_riders`,
`rider_values`, `team_transfers`) rather than touching `scores`.
This keeps the two competitions independent, and means the existing
Championship logic doesn't need to change regardless of whether Team
Manager ever gets built.
 
_Captured: August 2026 — not committed, revisit post-2027-launch._
 