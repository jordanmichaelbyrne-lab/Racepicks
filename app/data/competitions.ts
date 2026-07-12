export type Competition = {
  id: string;
  year: number;
  name: string;
  shortName: string;
  discipline: "supercross" | "outdoors" | "smx";
  status: "upcoming" | "active" | "finished";
  roundCount: number;
  entryFee: number;
  prizePoolEnabled: boolean;
};

export const competitions: Competition[] = [
  {
    id: "2027-supercross",
    year: 2027,
    name: "2027 Supercross Championship",
    shortName: "2027 Supercross",
    discipline: "supercross",
    status: "upcoming",
    roundCount: 17,
    entryFee: 0,
    prizePoolEnabled: false,
  },
  {
    id: "2027-outdoors",
    year: 2027,
    name: "2027 Pro Motocross Championship",
    shortName: "2027 Outdoors",
    discipline: "outdoors",
    status: "upcoming",
    roundCount: 11,
    entryFee: 0,
    prizePoolEnabled: false,
  },
  {
    id: "2027-smx",
    year: 2027,
    name: "2027 SuperMotocross World Championship",
    shortName: "2027 SMX Championship",
    discipline: "smx",
    status: "upcoming",
    roundCount: 3,
    entryFee: 0,
    prizePoolEnabled: false,
  },
];

export function getCompetition(competitionId: string) {
  return competitions.find(
    (competition) => competition.id === competitionId
  );
}