import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typo from 'typo-js';

dotenv.config();

const dictionary = new Typo('en_US', false, false, {
  dictionaryPath: './dictionaries/',
});
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// async function getRandomGif() {
//   const apiKey = process.env.TENOR_API_KEY;
//   const query = "mistake";
//   const limit = 10;

//   const response = await fetch(
//     `https://tenor.googleapis.com/v2/search?q=${query}&key=${apiKey}&limit=${limit}`
//   );
//   const json = await response.json();
//   const gifUrl = json.results[0].media_formats.gif.url;
//   return gifUrl;
// }

async function getCantSpell() {
  const apiKey = process.env.TENOR_API_KEY;
  const query = 'Minor Spelling Mistake';
  const limit = 10;

  try {
    const response = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=${limit}`
    );
    const json = await response.json();

    if (json.results && json.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * json.results.length);
      return json.results[randomIndex].media_formats.gif.url;
    } else {
      throw new Error('No Mistake Found liar');
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function isSpelledCorrectly (message) {
  if (message.length < 8) return false;

  const alphaCount = (message.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 4) return false;

  if (message.includes('<:') || message.includes('<@') || message.includes('<#')) return false;

  const upperCount = (message.match(/[A-Z]/g) || []).length;
  if (upperCount > alphaCount * 0.7) return false;

  const words = message.toLowerCase().split(/\s+/).filter(word => word.length > 0);

  if (words.length < 2) return false;

  let misspelledCount = 0;
  let totalValidWords = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');

    if (cleanWord.length <= 2 || /^\d+$/.test(cleanWord)) continue;

    const commonSlang = ['lol', 'lmao', 'omg', 'wtf', 'brb', 'tbh', 'imo', 'ngl', 'fr', 'rn', 'gg', 'ez', 'pog', 'sus'];
    if (commonSlang.includes(cleanWord.toLowerCase())) continue;

    if (/^(.)\1{2,}$/.test(cleanWord)) continue;

    totalValidWords++;

    if (!dictionary.check(cleanWord)) {
      misspelledCount++;
      console.log(`Misspelled word found: ${cleanWord}`);
    }
  }

  const shouldTrigger = totalValidWords >= 2 && misspelledCount >= 1 &&
    (misspelledCount >= 2 || (misspelledCount / totalValidWords) >= 0.5);

  return shouldTrigger;
}

console.log(isSpelledCorrectly('Tewt messae'));

// Replace module.exports with export default
export default getCantSpell;

client.once('ready', async () => {
  console.log('Ready!');
  client.user.setActivity({
    name: 'Swearing on Discord',
    type: ActivityType.Playing,
  });
});

// Define commands
const commands = [
  new SlashCommandBuilder()
    .setName('bad_spel')
    .setDescription('Will meme the un spellers'),
  new SlashCommandBuilder()
    .setName('swear')
    .setDescription('Reply with a random swear word!'),
  new SlashCommandBuilder().setName('rage').setDescription('Express rage!'),
  new SlashCommandBuilder()
    .setName('destroy')
    .setDescription('Destroy everything!'),
  new SlashCommandBuilder()
    .setName('mock')
    .setDescription('Mock your last message in alternating case!'),
  new SlashCommandBuilder()
    .setName('insult')
    .setDescription('Insult someone!')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The user to insult')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question!')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('funfact')
    .setDescription('Get a random fun fact!'),
].map((command) => command.toJSON());

// Add commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const fetchFunFact = async () => {
  try {
    const response = await fetch(
      'https://uselessfacts.jsph.pl/random.json?language=en'
    );
    const json = await response.json();
    return json.text;
  } catch (error) {
    console.error('Error fetching fun fact:', error);
    return "Oops! Couldn't fetch a fun fact right now. Try again later!";
  }
};

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'funfact') {
    const funFact = await fetchFunFact();
    await interaction.reply(funFact);
  }

  if (commandName === 'bad_Spel') {
    try {
      const spellGif = await getCantSpell();
      await interaction.reply({
        content: 'Minor Spelling Mistake',
        files: [spellGif],
      });
    } catch (error) {
      console.error(error);
    }
  }
});

const swearWords = [
  'Fuck you!',
  'Damn it!',
  'Shit!',
  'Hell yeah!',
  'Piss off!',
  'You bloody wanker!',
  'Bite me!',
  'Go to hell!',
];

const rageResponses = [
  'RAGE!',
  "I'm furious!",
  "I'm about to explode!",
  "You won't like me when I'm angry!",
];

const destroyResponses = [
  'DESTROY EVERYTHING!',
  'Total annihilation!',
  'Crush them all!',
  'Destruction begins now!',
];

const insults = [
  "You're a waste of space!",
  "You're about as useful as a screen door on a submarine.",
  "I'd agree with you but then we'd both be wrong.",
  "You bring everyone so much joy... when you leave the room.",
  "You're the reason the gene pool needs a lifeguard.",
  "If I had a dollar for every smart thing you said, I'd be broke.",
  "You're like a cloud—when you disappear, it's a beautiful day.",
  "You're proof that even evolution takes a break sometimes.",
  "You're not stupid; you just have bad luck thinking.",
  "You're like a software bug in human form.",
  "You're the human equivalent of a typo.",
  "You have something on your chin... no, the third one down.",
  "Your secrets are always safe with me. I never even listen when you tell me them.",
  "You're as sharp as a marble.",
  "You have something on your face… oh never mind, it’s just your face.",
];


const eightBallResponses = [
  'Yes.',
  'No.',
  'Maybe.',
  'Definitely.',
  'Ask again later.',
  'Without a doubt.',
  'My sources say no.',
  'Outlook not so good.',
];

// Helper function to mock text
const mockText = (text) => {
  return text
    .split('')
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join('');
};

// How it interacts
client.on('interactionCreate', async (interaction) => {
  console.log(interaction);
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'swear') {
    const randomSwear =
      swearWords[Math.floor(Math.random() * swearWords.length)];
    await interaction.reply(randomSwear);
  } else if (commandName === 'rage') {
    const randomRage =
      rageResponses[Math.floor(Math.random() * rageResponses.length)];
    await interaction.reply(randomRage);
  } else if (commandName === 'destroy') {
    const randomDestroy =
      destroyResponses[Math.floor(Math.random() * destroyResponses.length)];
    await interaction.reply(randomDestroy);
  } else if (commandName === 'mock') {
    const lastMessage = interaction.channel.lastMessage;
    if (lastMessage && lastMessage.content) {
      const mocked = mockText(lastMessage.content);
      await interaction.reply(mocked);
    } else {
      await interaction.reply("Couldn't find a message to mock!");
    }
  } else if (commandName === 'insult') {
    const target = interaction.options.getUser('target');
    const randomInsult = insults[Math.floor(Math.random() * insults.length)];
    await interaction.reply(`${target}, ${randomInsult}`);
  } else if (commandName === "8ball") {
    const question = interaction.options.getString("question");
    const randomResponse =
      eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await interaction.reply(`Question: "${question}"\nAnswer: ${randomResponse}`);
  }
});

// client.on(Events.MessageCreate, (msg) => {
//   console.log('Message Recieved');
// });

client.on('messageCreate', async (message) => {
  console.log(message);
  if (message.author.bot) return;

  if (!message.guild) return;

  if (message.content.startsWith('/') || message.content.startsWith('!')) return;

if (isSpelledCorrectly(message.content)) {
    const gifUrl = await getCantSpell();
    message.reply({
        files: [gifUrl],
      });
  }

  // if (!message.content.startsWith('!')) {
  //   const gifUrl = await getRandomGif();
  //   message.channel.send({
  //     content: 'hehehehehheheheheheh',
  //     files: [gifUrl],
  //   });
  // }
});

client.login(process.env.DISCORD_TOKEN);
