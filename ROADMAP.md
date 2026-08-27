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
- Trademark filed (word mark + logo) ahead of public launch.

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





## Racepicks Pro — Team Manager (Target: 2027, In Active Development)

**Status:** Committed to a 2027 target. A `/pro` landing page with a
live interest poll (question 1: would you play; question 2: price
sensitivity; question 3: what interests you most) is already built
and collecting responses in `pro_interest_responses`. Terms &
Privacy Policy updated with a forward-looking Pro section — no
detailed competition rules are legally binding yet, since the exact
scoring tables below are still marked TBC.

This section replaces the earlier, less-refined V1 draft — several
mechanics below are genuinely different from that first pass (most
notably the profit-sharing rule), not just more detail on the same
ideas. Where this spec conflicts with anything said about Pro
earlier in this file's history, **this version is the current one.**

### Relationship to the core game

Racepicks Pro is a **completely separate championship** running
alongside the normal Racepicks Championship — Pro subscribers keep
making their normal 1st/2nd/3rd/Wildcard picks exactly as before, and
additionally manage a season-long fantasy team with its own
leaderboard and scoring. *"Pro does not replace Racepicks. It adds
another championship."*

### 1. Team structure

5 riders per manager, in one of two legal configurations:

| Structure | Factory | Challenger |
|---|---|---|
| Factory Heavy | 3 | 2 |
| Challenger Heavy | 2 | 3 |

Every team must contain a minimum of 2 Factory and 2 Challenger
riders — managers choose which strategy to lean into.

### 2. Factory vs Challenger

Every eligible 450 rider gets a preseason classification:

- **Factory** — genuinely on a full-factory racing program.
- **Challenger** — everyone else (deliberately not called
  "privateer," since modern satellite/independent teams don't fit
  that older term cleanly).

**Classification freezes** before the relevant championship stage and
doesn't shift mid-season based on results — including a Challenger
temporarily riding a factory bike as an injury fill-in, which does
NOT change their classification until the next freeze point. This
prevents gaming the roster-composition rules.

### 3. Salary cap

**Provisional $31.0 million** — supported by internal simulation
work, but not final until run against the actual 2027 rider field.
Preseason rider salaries are built from a historical weighting model
(2026 results ~50%, 2025 ~30%, 2024 ~20%), with manual adjustment for
cases the historical data can't price properly (e.g. a strong 250
rider moving up to 450 for 2027).

**Salary bands** (establish starting ranges, not identical values
within a band): Championship Favourite, Elite, Podium Threat, Strong
Factory, Mid Factory / Elite Challenger, Strong Challenger, Mid
Challenger, Lower Field / Occasional.

### 4. Dynamic salaries

**Salary Adjustment Day: Monday after racing, every week.** No
mid-week price movement. **Maximum ±5% per adjustment** — caps how
much a single big result can swing a rider's price. This ±5% rule
was specifically tested in a 17-round internal simulation.

Importantly: **the $31M cap only applies when building or changing
your team.** If your existing team's market value grows past $31M
through good picks, you are NOT forced to sell anything — the cap
constrains transactions, not your team's ongoing value. This rewards
spotting value early.

### 5. Buying and selling — profit-sharing rule

**This is the mechanic that changed most from the earlier draft.**
Managers do not keep 100% of a rider's appreciation:

- **On a gain:** manager receives **50% of the appreciation**.
  Example: bought at $8.0M, now valued at $9.0M → sale value $8.5M.
- **On a loss:** manager absorbs **100% of the loss**. Example:
  bought at $8.0M, now valued at $7.5M → sale value $7.5M.

Every roster position tracks purchase price, current salary, and
sale value separately to support this.

### 6. Transfers

- **Factory/Primary transfers:** 3 for the entire season.
- **Challenger transfers:** 5 for the entire season (more, since many
  Challengers don't compete in every discipline/event).

### 7. Injury transfers

A **genuinely, officially confirmed** multi-race injury qualifies for
a **Free Injury Transfer** that doesn't consume a normal transfer
credit. Explicitly NOT for "my rider isn't performing well" —
prevents unfairly punishing managers for a real long-term injury
without opening the door to abuse.

**⚠️ CONFIRMED (Aug 2026) — Free SMX Non-Qualification Transfer.**
A second, separate trigger for a free transfer: a rider who **fails
to qualify for SMX Playoffs** at the end of the MX stage. This is
deliberately treated the same way as a genuine injury — a manager
who spent their limited season-long transfers reacting to earlier
form or injuries elsewhere shouldn't be locked out of fixing their
roster for the highest-stakes stretch of the season (SMX carries the
biggest scoring multipliers, up to ×2) over something that isn't
really a bad pick, just a hard end-of-season cutoff.

Unlike the injury exception, this one needs **no admin judgment
call** — SMX qualification is a public, binary fact, not something
requiring case-by-case confirmation. In practice: if a rider's
`smx_active` flag is `false` going into the SMX stage, they
automatically qualify a manager for one free transfer to replace
them, without touching the normal 3 Factory / 5 Challenger season
allowance.

**Deliberately NOT extended to the SX→MX boundary** — nearly every
rider who races SX also races MX, so there's no equivalent hard
qualification cutoff there. Adding a free transfer at that boundary
would dilute the season-long transfer scarcity for no real problem
it's solving.

### 8. Team lock

Pro roster locks at the **exact same time** as normal Racepicks picks
— no separate clock. Once locked, that round's 5-rider roster is
snapshotted; any transfer made after that applies to a future
eligible round, never rewrites the locked snapshot. Matters for
scoring integrity and auditability.

### 9. Scoring architecture (matters for how this gets built, not just the rules)

**Calculate each rider's fantasy score once per event, store it, and
have every manager who owned that rider inherit the same stored
score** — rather than recalculating per-manager. Store: base points,
Challenger bonus, holeshot bonus, multiplier, total. This is what
makes the system viable at 1,000+ players instead of recalculating
everything per roster. Manufacturer scoring is likewise calculated
once per manufacturer per event, not per manager.

### 10. Core scoring — by format

**⚠️ FORMULA CONFIRMED (Aug 2026)** — this project has now seen two
genuinely different descriptions of Triple Crown/MX scoring across
different ChatGPT sessions pasted into this file's history: a
weighted-percentage split, and a straight sum-per-race. **The
weighted version below is the confirmed, final one** — if anything
else in this document's earlier history says otherwise, this wins.

- **Holeshot bonus:** flat **+10**, regardless of Factory/Challenger,
  applies per race/moto (so a Triple Crown sweep = +30 holeshot
  points alone).
- **Normal SX:** finishing points + Challenger bonus (if applicable)
  + holeshot bonus.
- **Triple Crown SX (CONFIRMED WEIGHTED FORMULA):** Race 1 = 20% +
  Race 2 = 20% + Race 3 = 20% + Official Overall = 40%. A perfect
  1-1-1 sweep still equals ~100 base points — the same ceiling as a
  normal round — deliberately, so a Triple Crown weekend isn't worth
  3x a normal SX round just because more races happened. Challenger
  bonus is calculated per-race using a reduced/scaled bonus table
  (not the full normal-SX bonus three times over), for the same
  reason. Holeshots stay full value (+10) each race, uncapped by the
  weighting.
- **Pro Motocross (CONFIRMED WEIGHTED FORMULA):** Moto 1 = 25% +
  Moto 2 = 25% + Official Overall = 50%. A perfect 1-1 / 1st-overall
  day equals ~100 base points, keeping SX and MX roughly comparable
  despite the different formats. MX fields run much deeper (~40
  riders vs SX's ~22), so Challenger bonuses are judged against an
  MX-appropriate finishing scale, not a copy of the SX scale.
  Challenger bonus on MX = half bonus Moto 1 + half bonus Moto 2 +
  full bonus on the Overall.
- **Whole points only** — no half-points anywhere in Pro scoring.

**Implication for the results-entry system (not yet built):** the
existing free-game results form only captures 1st/2nd/3rd/Wildcard —
nowhere near enough for Pro. Pro scoring requires the FULL classified
finishing order for every Pro-eligible rider, per race, not just the
top 3 — and for Triple Crown/MX specifically, that means capturing
3 separate full classified results (Triple Crown) or 2 separate full
classified results plus the calculated overall (MX), each with its
own holeshot winner. This is a genuinely large unbuilt piece of work
— bigger than the rider database + admin UI + CSV tooling combined —
and should be scoped as its own project phase, not assumed to be a
small extension of the existing results form.

### 11. DNS / DNQ / DNF / disrupted events

Same "official result is the source of truth" philosophy as the core
Racepicks game:
- **DNS:** no finishing-position points.
- **SX DNQ:** treated identically to DNS, no special case.
- **DNF:** score whatever position the sanctioning body officially
  classifies the rider at.
- **Shortened race with an official result:** score it normally, no
  manual compensation for lost laps.
- **Cancelled race/event with no valid result:** no Pro scoring for
  that portion at all.
- **Official result corrections after scoring** (penalties, DQs,
  protests): admin "Recalculate Scores" function re-derives affected
  rider scores and every affected manager's round score from the
  corrected result.

### 12. Championship bonuses

Separate season-end bonuses for the SX Championship, Pro Motocross
Championship, and SMX Playoffs/Championship. **Exact bonus values are
TBC** — structure is agreed, numbers are not finalized (see TBC list
below).

### 13. SMX Playoff multipliers (locked)

| Playoff | Multiplier |
|---|---|
| Playoff 1 | ×1 |
| Playoff 2 | ×1.5 |
| Playoff 3 / Final | ×2 |

### 14. Manufacturer selection — new since the earlier draft

Every manager picks **one manufacturer** for the entire SMX season, as
a one-time preseason choice. It does **not** consume any of the $31M
rider salary cap, and locks for the season once chosen.

**Provisional 2027 tiers:**

| Tier | Manufacturers |
|---|---|
| A | Honda, Yamaha, KTM |
| B | Kawasaki, Husqvarna, Suzuki |
| C | Ducati, Triumph |
| D | Beta, GasGas |

**Scoring:** only the manufacturer's **highest-finishing eligible 450
rider** counts each race (prevents brands with more bikes on the
grid getting an unfair edge just from grid density). Bonuses are
**not cumulative** — a Tier D bike finishing 4th gets +4 only, not
+4 plus every lower bracket's bonus too:

| Best finish | Tier A | Tier B | Tier C | Tier D |
|---|---|---|---|---|
| 1st | +3 | +4 | +5 | +6 |
| 2nd–3rd | +2 | +3 | +4 | +5 |
| 4th–5th | +1 | +2 | +3 | +4 |
| 6th–10th | 0 | +1 | +2 | +3 |
| 11th–15th | 0 | 0 | +1 | +1 |
| 16th+ | 0 | 0 | 0 | 0 |

Manufacturer championship bonuses (deliberately small — a side-game,
not a substitute for good rider management): +5 for SX Manufacturer
Champion, +5 MX, +5 SMX.

**Design philosophy behind the tiers:** not intended to make every
manufacturer mathematically equal — Tier A is the safer, lower-reward
pick; Tier D is the underdog/higher-potential-reward pick. Internal
simulation showed this keeps manufacturer scoring in a range that can
matter in a close championship without ever dominating the actual
rider-management game.

### 15. Pro leaderboard

Fully separate from the standard Racepicks leaderboard. Suggested
layout: `POS | MANAGER | TEAM | ROUND | TOTAL | BEHIND`, with the
ability to open another manager's team once the relevant round has
locked (matches the existing core-game leaderboard's
"view another player's picks after lock" pattern).

### What's explicitly still TBC — do not treat these as final

Carried over directly from the source spec, since inventing numbers
here would be worse than leaving them open:

- **Exact Factory/base finishing-points table** (final SX/MX
  implementation numbers).
- **Exact Challenger bonus tables** — especially the final split
  between normal SX, Triple Crown races, and MX motos.
- **Rider SX/MX/SMX Championship bonus values.**
- **Final 2027 rider salaries** — can't be final until the actual
  2027 field is sufficiently known.
- **The $31M salary cap itself** — simulation-supported working
  number, not locked until run against the completed 2027 rider pool.

### Suggested implementation structure, when build work starts

If/when this gets built into the Workshop area, split it into
sections/tabs rather than one long page: **Overview | Team | Salary &
Transfers | Scoring | Challengers | Manufacturer | Race Rules.** Matches
how dense this specification already naturally divides.

### The philosophy, worth keeping visible in the actual product

*"Racepicks Pro rewards season-long team management — not just
picking race winners. Build within the salary cap, identify
undervalued riders, balance Factory stars against Challengers, manage
limited transfers, react to injuries and form, and carry your team
from Supercross through Pro Motocross and into the SMX Final."*

_Captured: August 2026 (initial concept) — refined to this V2 spec
Aug 2026. Target: 2027, alongside the core public launch. Several
numeric tables remain TBC — see list above._