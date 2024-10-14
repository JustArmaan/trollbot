const {
  Client,
  GatewayIntentBits,
  REST,
  SlashCommandBuilder,
  Routes,
  ActivityType,
} = require("discord.js");
require("dotenv").config();
const fetch = require("node-fetch");

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

async function getRandomGif() {
  const apiKey = "YOUR_TENOR_API_KEY"; //add api key later
  const query = "mistake";
  const limit = 1;

  const response = await fetch(
    `https://tenor.googleapis.com/v2/search?q=${query}&key=${apiKey}&limit=${limit}` //  change to whatever
  );
  const json = await response.json();
  const gifUrl = json.results[0].media_formats.gif.url;
  return gifUrl;
}

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
  new SlashCommandBuilder()
    .setName("mock")
    .setDescription("Mock your last message in alternating case!"),
  new SlashCommandBuilder()
    .setName("insult")
    .setDescription("Insult someone!")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to insult")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question!")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),
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

const insults = [
  "You're a waste of space!",
  "You're about as useful as a screen door on a submarine.",
  "I'd agree with you but then we'd both be wrong.",
  "You bring everyone so much joy... when you leave the room.",
];

const eightBallResponses = [
  "Yes.",
  "No.",
  "Maybe.",
  "Definitely.",
  "Ask again later.",
  "Without a doubt.",
  "My sources say no.",
  "Outlook not so good.",
];

// Helper function to mock text
const mockText = (text) => {
  return text
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join("");
};

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
  } else if (commandName === "mock") {
    const lastMessage = interaction.channel.lastMessage;
    if (lastMessage && lastMessage.content) {
      const mocked = mockText(lastMessage.content);
      await interaction.reply(mocked);
    } else {
      await interaction.reply("Couldn't find a message to mock!");
    }
  } else if (commandName === "insult") {
    const target = interaction.options.getUser("target");
    const randomInsult = insults[Math.floor(Math.random() * insults.length)];
    await interaction.reply(`${target}, ${randomInsult}`);
  } else if (commandName === "8ball") {
    const randomResponse =
      eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await interaction.reply(randomResponse);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) {
    const gifUrl = await getRandomGif();
    message.channel.send({
      content: "hehehehehheheheheheh",
      files: [gifUrl],
    });
  }
});

client.login(token);
