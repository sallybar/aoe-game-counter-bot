require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const cron = require("node-cron");

const { PLAYERS } = require("./players");
const { getAllPlayerStats } = require("./api");
const {
  buildLeaderboardEmbed,
  buildLoadingEmbed,
  buildErrorEmbed,
} = require("./embeds");

// ── Environment variables (set these in Railway) ──────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !CHANNEL_ID) {
  console.error(
    "❌ Missing required environment variables.\n" +
      "Make sure DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, " +
      "and DISCORD_CHANNEL_ID are set."
  );
  process.exit(1);
}

// ── Discord client ────────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Register slash commands ───────────────────────────────────────────────────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("games")
      .setDescription(
        "Show current season ranked game counts for all tracked players"
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("📡 Registering slash commands...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

// ── Core: fetch stats and post/update leaderboard ────────────────────────────
async function postLeaderboard(channel, isAuto = false) {
  // Send a loading message first
  let message;
  try {
    message = await channel.send({ embeds: [buildLoadingEmbed()] });
  } catch (err) {
    console.error("[Bot] Failed to send loading message:", err.message);
    return;
  }

  try {
    console.log(`[Bot] Fetching stats for ${PLAYERS.length} players...`);
    const stats = await getAllPlayerStats(PLAYERS);
    const embed = buildLeaderboardEmbed(stats, isAuto);
    await message.edit({ embeds: [embed] });
    console.log("[Bot] Leaderboard posted/updated.");
  } catch (err) {
    console.error("[Bot] Error building leaderboard:", err.message);
    await message
      .edit({
        embeds: [
          buildErrorEmbed(
            "Something went wrong while fetching stats. Please try again later."
          ),
        ],
      })
      .catch(() => {});
  }
}

// ── Handle /games slash command ───────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "games") return;

  // Acknowledge immediately (we'll edit the reply after fetching)
  await interaction.reply({ embeds: [buildLoadingEmbed()] });

  try {
    const stats = await getAllPlayerStats(PLAYERS);
    const embed = buildLeaderboardEmbed(stats, false);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[Bot] /games error:", err.message);
    await interaction
      .editReply({
        embeds: [
          buildErrorEmbed(
            "Something went wrong while fetching stats. Please try again later."
          ),
        ],
      })
      .catch(() => {});
  }
});

// ── Bot ready ─────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  await registerCommands();

  const channel = await client.channels.fetch(CHANNEL_ID).catch((err) => {
    console.error("❌ Could not fetch channel:", err.message);
    return null;
  });

  if (!channel) {
    console.error("❌ Channel not found. Check DISCORD_CHANNEL_ID.");
    return;
  }

  // Post immediately on startup
  console.log("[Bot] Posting initial leaderboard...");
  await postLeaderboard(channel, true);

  // Schedule auto-update every 24 hours at midnight UTC
  // Cron format: minute hour day month weekday
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] 24h tick — updating leaderboard...");
    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (ch) await postLeaderboard(ch, true);
  });

  console.log("[Bot] Scheduler running — leaderboard updates daily at midnight UTC.");
});

// ── Login ─────────────────────────────────────────────────────────────────────
client.login(TOKEN);
