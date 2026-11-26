export const PILOT_RANKS = [
  { name: 'ROOKIE', at: 0 },
  { name: 'WINGMAN', at: 750 },
  { name: 'CAPTAIN', at: 2000 },
  { name: 'ACE', at: 4000 },
];
function formatPoints(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function createPilotRank() {
  let total = 0;
  const flown = new Set();
  const rankFor = (points) => {
    let current = PILOT_RANKS[0];
    for (const rank of PILOT_RANKS) if (points >= rank.at) current = rank;
    return current;
  };
  return {
    get total() { return total; },
    rank() { return rankFor(total).name; },
    nextRank() {
      const idx = PILOT_RANKS.indexOf(rankFor(total));
      return idx < PILOT_RANKS.length - 1 ? PILOT_RANKS[idx + 1].name : null;
    },
    label() { return `${rankFor(total).name} · ${formatPoints(total)} PTS`; },
    completeSortie(id) { flown.add(id); },
    hasFlown(id) { return flown.has(id); },
    flownCount() { return flown.size; },
    add(points) {
      const before = rankFor(total).name;
      total += Math.max(0, Math.round(points));
      const rank = rankFor(total).name;
      return { rank, promoted: rank !== before };
    },
  };
}
