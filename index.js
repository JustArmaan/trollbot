import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { ActivityType, Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import googleTTS from 'google-tts-api';
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

const VOICE_OPTIONS = {
    'en-us': 'English (US)',
    'en-gb': 'English (UK)',
    'en-au': 'English (Australia)',
    'en-in': 'English (India)',
    'fr': 'French',
    'es': 'Spanish',
};

const guildVoices = new Map();

const commonSlang = ['lol', 'lmao', 'omg', 'wtf', 'brb', 'tbh', 'imo', 'ngl', 'fr', 'rn', 'gg', 'ez', 'pog', 'sus'];

// --- Giphy fetchers ---

async function getCantSpell(severity = 'minor') {
    const apiKey = process.env.GIPHY_API_KEY;
    const query = severity === 'major' ? 'major spelling mistake' : 'minor spelling mistake';
    const limit = 20;

    const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
    );
    const json = await response.json();

    if (!json.data || json.data.length === 0) {
        throw new Error('No Mistake Found liar');
    }

    const randomIndex = Math.floor(Math.random() * json.data.length);
    return json.data[randomIndex].images.original.url;
}

async function getRatioGif() {
    const apiKey = process.env.GIPHY_API_KEY;
    const query = "ratio'd";
    const limit = 20;

    const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
    );
    const json = await response.json();

    if (!json.data || json.data.length === 0) {
        throw new Error('No ratio GIF found');
    }

    const randomIndex = Math.floor(Math.random() * json.data.length);
    return json.data[randomIndex].images.original.url;
}

// --- Spelling classifier ---
// Returns "none" | "minor" | "major"
function classifySpelling(message) {
    if (message.includes('<:') || message.includes('<@') || message.includes('<#')) return 'none';

    const words = message
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0);

    // --- Single-word path ---
    if (words.length === 1) {
        const cleanWord = words[0].replace(/[^\w]/g, '');

        if (cleanWord.length <= 2 || /^\d+$/.test(cleanWord)) return 'none';
        if (commonSlang.includes(cleanWord)) return 'none';
        if (/^(.)\1{2,}$/.test(cleanWord)) return 'none';

        const alphaCount = (cleanWord.match(/[a-zA-Z]/g) || []).length;
        if (alphaCount < 3) return 'none';

        const upperCount = (cleanWord.match(/[A-Z]/g) || []).length;
        if (upperCount > alphaCount * 0.7) return 'none';

        if (dictionary.check(cleanWord)) return 'none';

        console.log(`Misspelled word found: ${cleanWord}`);
        return cleanWord.length >= 8 ? 'major' : 'minor';
    }

    // --- Multi-word path ---
    if (message.length < 8) return 'none';

    const alphaCount = (message.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 4) return 'none';

    const upperCount = (message.match(/[A-Z]/g) || []).length;
    if (upperCount > alphaCount * 0.7) return 'none';

    let misspelledCount = 0;
    let totalValidWords = 0;

    for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');

        if (cleanWord.length <= 2 || /^\d+$/.test(cleanWord)) continue;
        if (commonSlang.includes(cleanWord)) continue;
        if (/^(.)\1{2,}$/.test(cleanWord)) continue;

        totalValidWords++;

        if (!dictionary.check(cleanWord)) {
            misspelledCount++;
            console.log(`Misspelled word found: ${cleanWord}`);
        }
    }

    const shouldTrigger =
        totalValidWords >= 2 &&
        misspelledCount >= 1 &&
        (misspelledCount >= 2 || misspelledCount / totalValidWords >= 0.5);

    if (!shouldTrigger) return 'none';

    const ratio = misspelledCount / totalValidWords;
    return misspelledCount >= 3 || ratio >= 0.75 ? 'major' : 'minor';
}

client.once('ready', async () => {
    console.log('Ready!');
    client.user.setActivity({
        name: 'Swearing on Discord',
        type: ActivityType.Playing,
    });
});

// --- Slash command definitions ---
const commands = [
    new SlashCommandBuilder().setName('bad_spel').setDescription('Will meme the un spellers'),
    new SlashCommandBuilder().setName('swear').setDescription('Reply with a random swear word!'),
    new SlashCommandBuilder().setName('rage').setDescription('Express rage!'),
    new SlashCommandBuilder().setName('destroy').setDescription('Destroy everything!'),
    new SlashCommandBuilder().setName('mock').setDescription('Mock your last message in alternating case!'),
    new SlashCommandBuilder()
        .setName('insult')
        .setDescription('Insult someone!')
        .addUserOption((option) => option.setName('target').setDescription('The user to insult').setRequired(true)),
    new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question!')
        .addStringOption((option) => option.setName('question').setDescription('Your question').setRequired(true)),
    new SlashCommandBuilder().setName('funfact').setDescription('Get a random fun fact!'),
    new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Join your voice channel and say your message out loud')
        .addStringOption((option) =>
            option.setName('message').setDescription('What the bot should say').setRequired(true)
        ),
    new SlashCommandBuilder().setName('leave').setDescription('Disconnect the bot from the voice channel'),
    new SlashCommandBuilder()
        .setName('ratio')
        .setDescription('Call out a dry, one-word reply!')
        .addUserOption((option) => option.setName('target').setDescription('The user to ratio').setRequired(true)),
].map((command) => command.toJSON());

// Register commands
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
        const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
        const json = await response.json();
        return json.text;
    } catch (error) {
        console.error('Error fetching fun fact:', error);
        return "Oops! Couldn't fetch a fun fact right now. Try again later!";
    }
};

// --- Voice / TTS ---

// Keep one audio player per guild so /tts calls in the same server queue nicely
const audioPlayers = new Map();

function getPlayerForGuild(guildId) {
    if (!audioPlayers.has(guildId)) {
        audioPlayers.set(guildId, createAudioPlayer());
    }
    return audioPlayers.get(guildId);
}

// Google Translate's TTS endpoint caps requests at ~200 characters,
// so split long messages into chunks and queue them as separate resources.
function splitForTTS(text, maxLen = 200) {
    const words = text.split(/\s+/);
    const chunks = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxLen) {
            if (current) chunks.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) chunks.push(current);

    return chunks;
}

async function speakInChannel(interaction, text) {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
        await interaction.reply({
            content: 'You need to be in a voice channel first!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch (error) {
        console.error('Failed to join voice channel:', error);
        connection.destroy();
        await interaction.editReply("Couldn't connect to the voice channel.");
        return;
    }

    const player = getPlayerForGuild(voiceChannel.guild.id);
    connection.subscribe(player);

    const chunks = splitForTTS(text);

    try {
        for (const chunk of chunks) {
            const url = googleTTS.getAudioUrl(chunk, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
            });

            const resource = createAudioResource(url);
            player.play(resource);

            // dont remove, breaks EVERYTHING!!!
            await entersState(player, AudioPlayerStatus.Playing, 10_000);
            await new Promise((resolve) => {
                player.once(AudioPlayerStatus.Idle, resolve);
            });
        }

        await interaction.editReply(`🔊 Said: "${text}"`);
    } catch (error) {
        console.error('Error playing TTS audio:', error);
        await interaction.editReply('Something went wrong while speaking that.');
    }
}

// --- Static response pools ---

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

const rageResponses = ['RAGE!', "I'm furious!", "I'm about to explode!", "You won't like me when I'm angry!"];

const destroyResponses = ['DESTROY EVERYTHING!', 'Total annihilation!', 'Crush them all!', 'Destruction begins now!'];

const insults = [
    "You're a waste of space!",
    "You're about as useful as a screen door on a submarine.",
    "I'd agree with you but then we'd both be wrong.",
    'You bring everyone so much joy... when you leave the room.',
    "You're the reason the gene pool needs a lifeguard.",
    "If I had a dollar for every smart thing you said, I'd be broke.",
    "You're like a cloud—when you disappear, it's a beautiful day.",
    "You're proof that even evolution takes a break sometimes.",
    "You're not stupid; you just have bad luck thinking.",
    "You're like a software bug in human form.",
    "You're the human equivalent of a typo.",
    'You have something on your chin... no, the third one down.',
    'Your secrets are always safe with me. I never even listen when you tell me them.',
    "You're as sharp as a marble.",
    'You have something on your face… oh never mind, it’s just your face.',
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

// --- Single interaction handler for all slash commands ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'funfact': {
                const funFact = await fetchFunFact();
                await interaction.reply(funFact);
                break;
            }

            case 'bad_spel': {
                try {
                    const spellGif = await getCantSpell('minor');
                    await interaction.reply({
                        content: 'Minor Spelling Mistake',
                        files: [spellGif],
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.reply("Couldn't find a mistake gif right now.");
                }
                break;
            }

            case 'tts': {
                const message = interaction.options.getString('message');
                try {
                    await speakInChannel(interaction, message);
                } catch (error) {
                    console.error('Error handling /tts:', error);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply('Something went wrong with /tts.');
                    } else {
                        await interaction.reply('Something went wrong with /tts.');
                    }
                }
                break;
            }

            case 'leave': {
                const connection = getVoiceConnection(interaction.guildId);
                if (connection) {
                    connection.destroy();
                    await interaction.reply('👋 Left the voice channel.');
                } else {
                    await interaction.reply("I'm not in a voice channel.");
                }
                break;
            }

            case 'swear': {
                const randomSwear = swearWords[Math.floor(Math.random() * swearWords.length)];
                await interaction.reply(randomSwear);
                break;
            }

            case 'rage': {
                const randomRage = rageResponses[Math.floor(Math.random() * rageResponses.length)];
                await interaction.reply(randomRage);
                break;
            }

            case 'destroy': {
                const randomDestroy = destroyResponses[Math.floor(Math.random() * destroyResponses.length)];
                await interaction.reply(randomDestroy);
                break;
            }

            case 'mock': {
                const lastMessage = interaction.channel.lastMessage;
                if (lastMessage && lastMessage.content) {
                    const mocked = mockText(lastMessage.content);
                    await interaction.reply(mocked);
                } else {
                    await interaction.reply("Couldn't find a message to mock!");
                }
                break;
            }

            case 'insult': {
                const target = interaction.options.getUser('target');
                if (target.username === 'armaan2004') {
                    await interaction.reply('Error: Cannot compute insult for Armaan - too awesome! 🤖');
                } else {
                    const randomInsult = insults[Math.floor(Math.random() * insults.length)];
                    await interaction.reply(`${target}, ${randomInsult}`);
                }
                break;
            }

            case '8ball': {
                const question = interaction.options.getString('question');
                const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
                await interaction.reply(`Question: "${question}"\nAnswer: ${randomResponse}`);
                break;
            }

            case 'ratio': {
                const target = interaction.options.getUser('target');
                try {
                    const ratioGif = await getRatioGif();
                    await interaction.reply({
                        content: `${target} got ratio'd`,
                        files: [ratioGif],
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.reply("Couldn't find a ratio gif right now.");
                }
                break;
            }

            default:
                break;
        }
    } catch (error) {
        console.error(`Unhandled error in /${commandName}:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('Something went wrong.').catch(() => {});
        } else {
            await interaction.reply('Something went wrong.').catch(() => {});
        }
    }
});

// --- Passive spelling-mistake watcher ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.startsWith('/') || message.content.startsWith('!')) return;

    const severity = classifySpelling(message.content);

    if (severity !== 'none') {
        try {
            const gifUrl = await getCantSpell(severity);
            await message.reply({ files: [gifUrl] });
        } catch (error) {
            console.error('Failed to send spelling-mistake gif:', error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
