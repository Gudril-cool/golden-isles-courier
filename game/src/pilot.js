// The pilot's standing at Palma Field: a session rank that climbs with every point the
// courier banks, across every sortie flown before the page is closed. ROOKIE to WINGMAN to
// CAPTAIN to ACE — the thresholds are the field's idea of a reputation, and the rank rides
// on the title screen and on every mission-complete board, so a good evening shows.

/** The ranks and the cumulative score each one asks for. */
export const PILOT_RANKS = [
  { name: 'ROOKIE', at: 0 },
  { name: 'WINGMAN', at: 750 },
  { name: 'CAPTAIN', at: 2000 },
  { name: 'ACE', at: 4000 },
];

/** Points with their thousands comma, the way the scoreboard writes them. */
function formatPoints(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Create the pilot's rank book. add(points) banks a finished sortie's score and reports
 * { rank, promoted }. rank() is the current rank's name; label() is the scoreboard line,
 * "WINGMAN · 1,240 PTS".
 */
export function createPilotRank() {
  let total = 0;
  const rankFor = (points) => {
    let current = PILOT_RANKS[0];
    for (const rank of PILOT_RANKS) if (points >= rank.at) current = rank;
    return current;
  };
  return {
    /** Cumulative points banked this session. */
    get total() { return total; },
    /** The current rank's name. */
    rank() { return rankFor(total).name; },
    /** The next rank's name, or null at the top of the board. */
    nextRank() {
      const idx = PILOT_RANKS.indexOf(rankFor(total));
      return idx < PILOT_RANKS.length - 1 ? PILOT_RANKS[idx + 1].name : null;
    },
    /** The scoreboard line for the title screen and the results board. */
    label() { return `${rankFor(total).name} · ${formatPoints(total)} PTS`; },
    /** Bank a sortie's score; reports the rank now held and whether it was just earned. */
    add(points) {
      const before = rankFor(total).name;
      total += Math.max(0, Math.round(points));
      const rank = rankFor(total).name;
      return { rank, promoted: rank !== before };
    },
  };
}
