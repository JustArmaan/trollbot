const {
  Client,
  GatewayIntentBits,
  REST,
  SlashCommandBuilder,
  Routes,
  ActivityType,
} = require("discord.js");
require("dotenv").config();

const { token, clientId } = require("./config.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once("ready", async () => {
  console.log("Ready!");
  client.user.setActivity({
    name: "Swearing on Discord",
    type: ActivityType.Playing,
  });
});

// Define commands
const commands = [
  new SlashCommandBuilder()
    .setName("swear")
    .setDescription("Reply with a random swear word!"),
  new SlashCommandBuilder().setName("rage").setDescription("Express rage!"),
  new SlashCommandBuilder()
    .setName("destroy")
    .setDescription("Destroy everything!"),
].map((command) => command.toJSON());

// Add commands
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

const swearWords = [
  "Fuck you!",
  "Damn it!",
  "Shit!",
  "Hell yeah!",
  "Piss off!",
  "You bloody wanker!",
  "Bite me!",
  "Go to hell!",
];

const rageResponses = [
  "RAGE!",
  "I'm furious!",
  "I'm about to explode!",
  "You won't like me when I'm angry!",
];

const destroyResponses = [
  "DESTROY EVERYTHING!",
  "Total annihilation!",
  "Crush them all!",
  "Destruction begins now!",
];

// How it interacts
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "swear") {
    const randomSwear =
      swearWords[Math.floor(Math.random() * swearWords.length)];
    await interaction.reply(randomSwear);
  } else if (commandName === "rage") {
    const randomRage =
      rageResponses[Math.floor(Math.random() * rageResponses.length)];
    await interaction.reply(randomRage);
  } else if (commandName === "destroy") {
    const randomDestroy =
      destroyResponses[Math.floor(Math.random() * destroyResponses.length)];
    await interaction.reply(randomDestroy);
  }
});

client.login(token);
