const { Client, GatewayIntentBits, REST, SlashCommandBuilder, Routes, ActivityType } = require('discord.js');
require('dotenv').config();

// const token = process.env.DISCORD_TOKEN;
// const API_KEY = process.env.API_KEY;
// const clientId = process.env
const { token, clientId } = require('./config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});


// discord 봇이 실행될 때 딱 한 번 실행할 코드를 적는 부분
client.once('ready', async () => {
    console.log('Ready!');
    client.user.setActivity({
        name: 'Discord 봇 개발',
        type: ActivityType.Playing,
    });
});

const commands = [
    new SlashCommandBuilder()
        .setName('swear')
        .setDescription('Reply with swear words!'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(
                clientId,
            ),
            {
                body: commands,
            }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild, user, member } = interaction;

    // 명령어 처리
    if (commandName === 'swear') {
        await interaction.reply
            ('Fuck you!');
    } else if (commandName === 'rage') {
        await interaction.reply
            ('RAGE!');
    }
    else if (commandName === 'destroy') {
        await interaction.reply
            ('DESTROY!');
    }
});

// 봇과 서버를 연결해주는 부분
client.login(token);