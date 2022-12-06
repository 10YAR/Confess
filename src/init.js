import {CLIENT_ID, BOT_TOKEN} from '../config/constants.js'
import {Client, REST, Routes, IntentsBitField, Partials} from "discord.js";
import {commands} from "./commands.js";

const rest = new REST({version: '10'}).setToken(BOT_TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {body: commands});
    } catch (error) {
        console.error(error);
    }
})();

export const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.DirectMessageReactions,
        IntentsBitField.Flags.MessageContent,
    ],
    partials: [
        Partials.User,
        Partials.Channel, // Required to receive DMs
        Partials.Message,
        Partials.Reaction
    ]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(': DM me /confess', {type: 1});
});

client.login(BOT_TOKEN);