import { createClient } from "@/app/lib/supabase/server";

export type TeamRoundProgress = {
  eventId: string;
  venue: string;
  roundNumber: number;
  raceDate: string;
  roundPoints: number;
  cumulativePoints: number;
  rank: number;
  leagueSize: number;
};

// Builds ONE team's full season-to-date progression, including that
// team's league rank AT EACH ROUND (not just the current/final rank)
// — re-derived by replaying every team's cumulative total round by
// round from pro_team_round_scores. This is what lets the progression
// chart show "were we #1 after round 3" rather than only "we're #1
// now".
export async function getTeamRankHistory(
  teamId: string,
  season: number
): Promise<TeamRoundProgress[]> {
  const supabase = await createClient();

  const { data: teamsRows } = await supabase
    .from("pro_teams")
    .select("id")
    .eq("season", season);

  const allTeamIds = (teamsRows ?? []).map((t) => t.id);
  if (allTeamIds.length === 0) return [];

  const { data: scoreRows } = await supabase
    .from("pro_team_round_scores")
    .select("team_id, event_id, total_points, events(venue, round_number, race_date)")
    .in("team_id", allTeamIds);

  type Row = {
    teamId: string;
    eventId: string;
    venue: string;
    roundNumber: number;
    raceDate: string;
    points: number;
  };

  const rows: Row[] = (scoreRows ?? [])
    .map((r) => {
      const event = Array.isArray(r.events) ? r.events[0] : r.events;
      if (!event) return null;
      return {
        teamId: r.team_id,
        eventId: r.event_id,
        venue: event.venue,
        roundNumber: event.round_number,
        raceDate: event.race_date,
        points: r.total_points,
      };
    })
    .filter((r): r is Row => r !== null);

  // O(1) lookup instead of re-scanning rows per team per event.
  const pointsByTeamEvent = new Map<string, number>();
  for (const r of rows) {
    pointsByTeamEvent.set(`${r.teamId}|${r.eventId}`, r.points);
  }

  const eventOrder = Array.from(
    new Map(
      rows.map((r) => [
        r.eventId,
        { eventId: r.eventId, venue: r.venue, roundNumber: r.roundNumber, raceDate: r.raceDate },
      ])
    ).values()
  ).sort((a, b) => (a.raceDate < b.raceDate ? -1 : 1));

  const cumulativeByTeam = new Map<string, number>();
  const result: TeamRoundProgress[] = [];

  for (const event of eventOrder) {
    for (const tId of allTeamIds) {
      const roundPoints = pointsByTeamEvent.get(`${tId}|${event.eventId}`) ?? 0;
      cumulativeByTeam.set(tId, (cumulativeByTeam.get(tId) ?? 0) + roundPoints);
    }

    const ranked = allTeamIds
      .map((id) => ({ id, total: cumulativeByTeam.get(id) ?? 0 }))
      .sort((a, b) => b.total - a.total);

    const ourRank = ranked.findIndex((r) => r.id === teamId) + 1;

    result.push({
      eventId: event.eventId,
      venue: event.venue,
      roundNumber: event.roundNumber,
      raceDate: event.raceDate,
      roundPoints: pointsByTeamEvent.get(`${teamId}|${event.eventId}`) ?? 0,
      cumulativePoints: cumulativeByTeam.get(teamId) ?? 0,
      rank: ourRank,
      leagueSize: allTeamIds.length,
    });
  }

  return result;
}