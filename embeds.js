const fetch = require("node-fetch");

const AOE4_API_BASE = "https://aoe4world.com/api/v0";

/**
 * Fetch current season RANKED SOLO stats only for a player by their profile ID.
 */
async function getRankedStatsForProfile(profileId) {
  const url = `${AOE4_API_BASE}/players/${profileId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { games: 0, wins: 0 };
    const data = await res.json();

    // rm_solo = ranked match 1v1 only
    const solo = data.modes?.rm_solo ?? {};

    const games = solo.games_count ?? 0;
    const wins  = solo.wins_count  ?? 0;

    return { games, wins };
  } catch (err) {
    console.error(`[API] Error fetching profile ${profileId}:`, err.message);
    return { games: 0, wins: 0 };
  }
}

/**
 * Given a player display name and their list of account objects {name, id},
 * returns an object with per-account breakdown and totals.
 */
async function getPlayerStats(displayName, accounts) {
  const results = [];
  let totalGames = 0;
  let totalWins  = 0;

  for (const account of accounts) {
    const { games, wins } = await getRankedStatsForProfile(account.id);
    results.push({ account: account.name, id: account.id, games, wins, found: true });
    totalGames += games;
    totalWins  += wins;

    // Small delay to be kind to the API
    await new Promise((r) => setTimeout(r, 300));
  }

  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

  return { displayName, accounts: results, totalGames, totalWins, winRate };
}

/**
 * Fetch stats for all players in parallel (per player, not per account).
 */
async function getAllPlayerStats(players) {
  const promises = players.map((p) => getPlayerStats(p.displayName, p.accounts));
  return Promise.all(promises);
}

module.exports = { getAllPlayerStats };
