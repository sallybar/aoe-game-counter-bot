const { EmbedBuilder } = require("discord.js");

const MEDALS = ["🥇", "🥈", "🥉"];
const CIVS_EMOJI = "⚔️";

/**
 * Build a Discord embed showing the leaderboard.
 * @param {Array} stats - result from getAllPlayerStats()
 * @param {boolean} isAuto - true if triggered by scheduler, false if by command
 */
function buildLeaderboardEmbed(stats, isAuto = false) {
  // Sort by total games descending
  const sorted = [...stats].sort((a, b) => b.totalGames - a.totalGames);

  const grandTotalGames = sorted.reduce((sum, p) => sum + p.totalGames, 0);
  const grandTotalWins  = sorted.reduce((sum, p) => sum + p.totalWins,  0);
  const grandWinRate    = grandTotalGames > 0
    ? ((grandTotalWins / grandTotalGames) * 100).toFixed(1)
    : "0.0";

  const now = new Date();
  const timestamp = now.toUTCString();

  const embed = new EmbedBuilder()
    .setTitle(`${CIVS_EMOJI} AoE4 Ranked Stats — Current Season`)
    .setColor(0xc8960c)
    .setFooter({ text: `${isAuto ? "Auto-updated" : "Last updated"} • ${timestamp}` })
    .setThumbnail("https://aoe4world.com/assets/images/logo.png");

  // Build leaderboard fields
  sorted.forEach((player, index) => {
    const medal = MEDALS[index] ?? `${index + 1}.`;

    // Per-account breakdown lines
    const breakdown = player.accounts
      .map((a) => {
        const losses = a.games - a.wins;
        const wr = a.games > 0 ? ((a.wins / a.games) * 100).toFixed(1) : "0.0";
        return `\`${a.account}\` — ${a.games} games | ${a.wins}W ${losses}L | ${wr}% WR`;
      })
      .join("\n");

    const losses  = player.totalGames - player.totalWins;

    embed.addFields({
      name: `${medal} ${player.displayName} — **${player.totalGames} games | ${player.totalWins}W ${losses}L | ${player.winRate}% WR**`,
      value: breakdown,
      inline: false,
    });
  });

  const grandLosses = grandTotalGames - grandTotalWins;

  embed.addFields({
    name: "─────────────────────",
    value: `🎮 **Group Total: ${grandTotalGames} games | ${grandTotalWins}W ${grandLosses}L | ${grandWinRate}% WR**`,
    inline: false,
  });

  return embed;
}

/**
 * Build a simple "loading" embed shown while fetching.
 */
function buildLoadingEmbed() {
  return new EmbedBuilder()
    .setTitle("⏳ Fetching AoE4 Stats...")
    .setDescription("Querying aoe4world.com for all accounts. This may take 10–20 seconds.")
    .setColor(0x5865f2);
}

/**
 * Build an error embed.
 */
function buildErrorEmbed(message) {
  return new EmbedBuilder()
    .setTitle("❌ Error Fetching Stats")
    .setDescription(message)
    .setColor(0xff0000);
}

module.exports = { buildLeaderboardEmbed, buildLoadingEmbed, buildErrorEmbed };
