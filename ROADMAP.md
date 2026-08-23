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





## Future — "RacePicks Pro: Team Manager" (Target: 2028, Not Yet Committed)

**Status:** Fully designed at a mechanical/rules level (V1 spec below,
Aug 2026). Explicitly NOT committed to being built. Target timeline
pushed to **2028**, not 2027 — Racepicks itself hasn't had its public
launch yet, and this is a large enough build that it shouldn't compete
for attention with getting the core product stable and proven first.

**Before any engineering work begins:** build a landing page describing
this concept once the 2027 public launch is live, with an interest
poll ("would you pay for this?" style, not just generic
interest/not-interested) to validate real demand before investing
build time. See the Championship Selector section above for the same
"Coming Soon" email-capture pattern this can reuse.

### Relationship to the core game

RacePicks Pro is **completely separate** from the normal Championship
— Pro subscribers keep playing the standard 1st/2nd/3rd/Wildcard game
exactly as-is, and additionally get access to a much deeper fantasy
team competition with its own leaderboard, scoring, and (potentially)
its own larger prize pool.

Results import for Pro re-uses the same pattern already proven for
the RacerX entry-list importer — but note MX scoring requires the
**full finishing field down to ~35th-40th place**, not just the top
few positions the current entry-list scraper handles, so the results
importer will need meaningfully more parsing depth than what exists
today.

### V1 rules summary

**Team structure:** 5 riders per manager, in either 3-Factory/2-Challenger
or 2-Factory/3-Challenger configuration (min 2 / max 3 of either).
"Factory vs Challenger" replaces the earlier "mandatory privateer"
idea — Challenger covers satellite/supported/independent riders under
one simpler category. Factory/Challenger classification is frozen per
season stage (SX → MX → SMX Playoffs) to prevent exploiting temporary
fill-in rides.

**Master rider database:** riders are permanent records with
per-stage (SX/MX/SMX) classification, eligibility, current + historical
salary, and injury status.

**Salary cap:** same cap for every manager (exact figure — $25m/$30m/
etc. — deliberately not locked yet; needs modelling against a realistic
2027 rider field before launch). Rider salaries start at an admin-set
opening value and move dynamically based on performance.

**Salary Adjustment Day:** Mondays only, after the weekend's results
are scored. Salaries are fixed for the rest of the week — no
mid-week or raceday price changes.

**Profit protection:** selling a rider is capped at the lower of
current market value or 110% of purchase price — prevents budget
farming via repeated trades, while still rewarding spotting a genuine
undervalued rider.

**Transfers:** 3 for the season on Factory riders, 5 on Challenger
riders — deliberately scarce, forces real team-building decisions.

**Injury transfers:** admin manually flags a rider as injury-eligible;
affected managers get a free replacement (doesn't use normal transfer
allowance, no profit-taking allowed on the replacement value).

**Team lock:** Pro roster locks at the exact same time as normal
Racepicks picks — no separate clock to manage.

**Scoring — deliberately normalized across formats:**
- SX: ~100 points for a perfect finish, +10 holeshot bonus.
- MX: Moto 1 (25%) + Moto 2 (25%) + Overall (50%) = ~100 for a
  perfect day; scoring table extends to ~35th-40th to keep
  lower-field Challenger performance meaningful.
- Triple Crown SX: three races at 20% each + Overall at 40% = ~100
  for a perfect sweep (prevents Triple Crown weekends being worth 3x
  a normal round).
- Challenger bonus: extra points on top of base score, scaled by
  finishing position, roughly halved per-moto in multi-moto formats
  with a full bonus on the overall result.
- SMX Playoffs: round multipliers ×1.0 / ×1.5 / ×2.0, final score
  rounded to a whole number (no visible half-points).
- Championship bonuses (SX / MX / Final SMX) — the Final SMX bonus is
  the largest, reflecting it being the ultimate championship.

**Anti-exploit protection — the part worth remembering most:**
championship bonuses are **prorated by how many rounds of that
championship the manager actually owned the rider for** — this
specifically prevents someone buying the season's points leader right
before the final round and pocketing a bonus they didn't earn. This
detail alone is worth preserving even if nothing else about V1
survives to an eventual build.

**DNS/DNQ/DNF handling:** simple rule — if there's an official
classified result, score it exactly as classified (no extra DNF
penalty layered on top). No official result = 0. Same logic applies
cleanly to shortened or partially cancelled events: score whatever
portion has an official result, skip whatever doesn't.

**Explicitly out of scope for V1:** qualifying position, fastest lap,
positions gained, practice, heat races, laps led, manufacturer points.
Deliberately excluded to avoid extra data-dependency and admin burden
beyond official results + holeshots.

**Weekly admin workflow (the actual design goal):** import/publish
results → confirm holeshot winner(s) → click "Publish & Calculate" →
system handles normal Racepicks scores, Pro rider scores, Pro team
scores, and the Pro leaderboard automatically. Monday: review
suggested salary changes, apply them. That should be the full weekly
Pro admin surface — if it ends up being more manual than this in
practice, that's a signal the design needs revisiting before launch,
not after.

### What still needs deciding before this could be built

- **Starting salary cap and opening rider salaries** — deliberately
  not locked yet. Needs modelling against a real hypothetical 2027
  rider field to make sure the cap allows many viable team
  combinations, not just "pick the five obvious stars."
- Run a simulation comparing 3-Factory/2-Challenger against
  2-Factory/3-Challenger before launch — if one build consistently
  dominates, adjust salaries/Challenger bonuses rather than the whole
  ruleset.
- Real audience validation (see landing-page poll above) — this is
  meaningfully more mechanical complexity than the core Racepicks
  game, and worth confirming casual players actually want this level
  of depth before committing engineering time to it.

_Captured: August 2026 (concept) — expanded to full V1 spec Aug 2026.
Target 2028, not committed. Validate demand before building._