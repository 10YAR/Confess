import {client} from "./init.js";
import {db} from "../config/mysql.js";
import {PermissionsBitField, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder} from "discord.js";
import { randomEmoji } from "../libs/random-emoji.js";


client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'invite') {
        await sendReply(interaction, 'https://discord.com/api/oauth2/authorize?client_id=796832150853779456&permissions=19456&redirect_uri=https%3A%2F%2Fconfess.diyar.dev&response_type=code&scope=messages.read%20applications.commands%20bot');
    }

    if (interaction.commandName === 'help') {
        let theGuild;

        if (interaction.channel.type === 0) theGuild = await checkGuildExist(interaction.guild.id);
        const color = (theGuild != null && theGuild[0] !== undefined && theGuild[0].color !== undefined) ? JSON.parse(theGuild[0].color) : [66, 84, 121];

        const helpMsgEmbed = new EmbedBuilder()
            .setTitle('Confess Bot')
            .setDescription('Confess Bot is a bot that allows you to confess anonymously!')
            .setColor(color)
            .addFields(
                {name: '--------------------------', value: '**Commands :**'},
                {name: '```/help```', value: 'Help command for the bot'},
                {name: '```/confess```', value: 'Allows you to confess! (Use this only in DMs)'},
                {name: '```/invite```', value: 'Invite link for the bot'},
                {name: '```/setchannel```', value: 'Sets the channel for the bot to send messages in [ADMIN ONLY]'},
                {name: '```/customize```', value: 'Customize the bot [ADMIN ONLY]'},
                {name: '--------------------------', value:'Make sure to enable the "Allow direct messages from server members" option in your settings!'},
                {name: 'Need more help ?', value: 'Discord: 10YAR#0001'}
            );
        try {
            interaction.reply({embeds: [helpMsgEmbed]});
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'customize') {
        if (await hasAdminPermission(interaction)) {
            if (interaction.channel.type !== 1) {
                const theGuild = await checkGuildExist(interaction.guild.id);
                const color = (theGuild != null && theGuild[0] !== undefined && theGuild[0].color !== undefined) ? JSON.parse(theGuild[0].color) : [66, 84, 121];
                let subCommand;
                try {
                    subCommand = interaction.options.getSubcommand();
                } catch (error) {
                    console.log(error);
                }

                if (typeof subCommand == 'undefined') {

                    const customizeEmbed = new EmbedBuilder()
                        .setTitle('Customize')
                        .setDescription('Customize the bot')
                        .setColor(color)
                        .addFields(
                            {name: '--------------------------', value: '**Commands :**'},
                            {name: '```/customize title [Text]```', value: 'Change confessions title'},
                            {name: '```/customize color [#FFFFFF]```', value: 'Change confessions color'},
                            {name: '```/customize footer [Text]```', value: 'Change confessions footer'},
                            {name: '```/customize reset```', value: 'Reset the bot\'s customization'},
                            {name: '--------------------------', value: 'Need more help ? Discord: 10YAR#0001'}
                        );
                    try {
                        interaction.reply({embeds: [customizeEmbed]});
                    } catch (error) {}

                } else {

                    if (subCommand === 'color') {

                        const colorHex = interaction.options.getString('color');
                        const rgb = await hexToRgb(colorHex);
                        if (rgb != null) {
                            if (theGuild != null) {
                                db.query("UPDATE servers SET color = ? WHERE guild_id = ?", [JSON.stringify(rgb), interaction.guild.id],
                                    function (err, result, fields) {
                                        console.log("Color updated! (" + interaction.guild.id + ") " + interaction.guild.name + " - (" + colorHex + ")");
                                    });

                                const colorEmbed = new EmbedBuilder()
                                    .setTitle('Color changed!')
                                    .setDescription('Color has been changed to ' + colorHex)
                                    .setColor(rgb);
                                interaction.reply({embeds: [colorEmbed]});

                            } else await setChannelError(interaction);

                        } else await sendReply(interaction, 'Invalid color! Make sure to use an HEX color.');

                    }
                    else if (subCommand === 'reset') {

                        if (theGuild != null) {

                            db.query("UPDATE servers SET color = NULL, title = NULL, footer = NULL WHERE guild_id = ?", [interaction.guild.id],
                                function (err, result, fields) {
                                    console.log("Reset successful ! (" + interaction.guild.id + ") " + interaction.guild.name);
                                });
                            await sendReply(interaction, 'Reset successful!');

                        } else await setChannelError(interaction);

                    }
                    else if (subCommand === 'title') {

                        const title = interaction.options.getString('title');

                        if (theGuild != null) {

                            db.query("UPDATE servers SET title = ? WHERE guild_id = ?", [title, interaction.guild.id],
                                function (err, result, fields) {
                                    console.log("Title updated! (" + interaction.guild.id + ") " + interaction.guild.name + " - (" + title + ")");
                                });
                            await sendReply(interaction, 'Title updated!');

                        } else await setChannelError(interaction);

                    }
                    else if (subCommand === 'footer') {

                        const footer = interaction.options.getString('footer');

                        if (theGuild != null) {

                            db.query("UPDATE servers SET footer = ? WHERE guild_id = ?", [footer, interaction.guild.id],
                                function (err, result, fields) {
                                    console.log("Footer updated! (" + interaction.guild.id + ") " + interaction.guild.name + " - (" + footer + ")");
                                });
                            await sendReply(interaction, 'Footer updated!');

                        } else await setChannelError(interaction);

                    } else await sendReply(interaction, 'Invalid command!');
                }
            }
        } else await sendReply(interaction, 'You don\'t have permission to do that!');
    }

    if (interaction.commandName === 'setchannel') {
        let msgText;
        if (interaction.channel.type !== 1 && await hasMessagePermission(interaction.channel)) {
            if (await hasAdminPermission(interaction)) {
                await setChannel(interaction.guild.id, interaction.guild.name, interaction.channel.id);
                msgText = 'Channel set!';
            } else msgText = 'You don\'t have permission to do that!';
        } else msgText = 'Please use this command in a server channel!';

        await sendReply(interaction, msgText);
    }

    if (interaction.commandName === 'confess') {
        if (interaction.channel.type === 1) {

            // STEP 1 : Write the Confession
            const msgEmbed = await new EmbedBuilder()
                .setTitle("Tell me what's on your mind! " + randomEmoji())
                .setDescription("Please write your confession below.\n You can use *markdown* to format your message.\n\n Your confession is fully anonym.")
                .setColor([66, 84, 121]);

            interaction.reply({embeds: [msgEmbed], fetchReply: true})
                .then(async () => {
                    // STEP 2 : Select a server & Confirm Confession
                    interaction.channel.awaitMessages({max: 1, time: 900000, errors: ['time']})
                        .then(async collected => {

                            const guilds = [];
                            const cacheGuilds = await interaction.client.guilds.cache;
                            const memberId = await interaction.user;
                            for (const [, guild] of cacheGuilds) {
                                await guild.members.fetch(memberId).then(() => guilds.push(guild)).catch(error => { return true });
                            }

                            const selectServers = [];
                            for (let i = 0; i < Object.keys(guilds).length; i++) {
                                selectServers.push({label: Object.entries(guilds)[i][1].name, value: Object.entries(guilds)[i][1].id});
                            }

                            const confession = collected.first().content;
                            const serverSelectEmbed = new EmbedBuilder()
                                .setTitle("Select the server you want the confession to be posted on")
                                .setColor([66, 84, 121]);

                            const selectAction = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId('selectServer')
                                        .setPlaceholder('Nothing selected')
                                        .addOptions(...selectServers)
                                );

                            try {
                                await interaction.followUp({embeds: [serverSelectEmbed], components: [selectAction]});
                            } catch (error) {}

                            // STEP 4 : Sending and Saving Confession
                            interaction.channel.awaitMessageComponent({componentType: 3, time: 15000})
                                .then(async collected => {
                                    await collected.deferUpdate();

                                    const guildId = collected.values[0];
                                    const guildRes = await checkGuildExist(guildId);

                                    if (guildRes[0] != null) {
                                        const color = JSON.parse(guildRes[0].color) ?? [66, 84, 121];
                                        const serverGuild = await client.guilds.cache.get(guildId);
                                        if (serverGuild != null) {

                                            const serverChannel = await serverGuild.channels.fetch(guildRes[0].channel_id);

                                            if (serverChannel != null) {
                                                const confessionEmbed = new EmbedBuilder()
                                                    .setDescription(confession)
                                                    .setColor(color);
                                                if (guildRes[0].title != null) confessionEmbed.setTitle(guildRes[0].title ?? "New confession !")
                                                if (guildRes[0].footer != null)
                                                    confessionEmbed.setFooter({text: guildRes[0].footer ?? "ConfessBot", iconURL: "https://cdn.discordapp.com/app-icons/796832150853779456/a97e04a3249e940fceb5a847e2e1ee89.png"});

                                                await serverChannel.send({embeds: [confessionEmbed]});
                                                await saveConfession(confession, interaction.user.id, interaction.user.username, interaction.user.discriminator, guildId, 'SENT');

                                                try {
                                                    await interaction.followUp('Confession sent! \nCheck it out : ' + serverChannel.toString());
                                                } catch (error) {}
                                            } else {
                                                await saveConfession(confession, interaction.user.id, interaction.user.username, interaction.user.discriminator, guildId, 'ERROR');
                                                try {
                                                    await interaction.followUp('Error: Channel not found');
                                                } catch (error) {}
                                            }
                                        }
                                    } else {
                                        try {
                                            await interaction.followUp({content: 'Error: This server is not configured yet! Please contact their admins.'});
                                        } catch (error) {}
                                    }
                                });
                        })
                        .catch(collected => {
                            try {
                                interaction.followUp('Error, type the /confess command again please.');
                            } catch (error) {}
                        });

                });
        } else await sendReply(interaction, 'Please use this command in a DM!');
    }
});


async function checkGuildExist(guildId) {
    const result = async (guildId) => {
        return new Promise((resolve, reject) => {
            db.query("SELECT * FROM servers WHERE guild_id = ?", [guildId], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    }
    return await result(guildId);
}

async function hasAdminPermission(msg) {
    let res = false;
    try {
    res = msg.member.permissionsIn(msg.channel).has("ADMINISTRATOR");
    } catch (error) {}
    return res;
}

async function hasMessagePermission(channel) {
    let res = false;
    try {
        res = channel.permissionsFor(client.user.id).has(PermissionsBitField.Flags.SendMessages);
    } catch (error) {}
    return res;
}

async function setChannel(guildId, guildName, channelId) {
    try {
        db.query("SELECT * FROM servers WHERE guild_id = ?", [guildId], (err, result) => {
            if (result[0] == null) {
                db.query("INSERT INTO servers (guild_id, guild_name, channel_id) VALUES (?, ?, ?)", [guildId, guildName, channelId],
                    function (err, result, fields) {
                    console.log("Channel set! (" + guildId + ") " + guildName + " - (" + channelId + ")");
                });
            } else {
                db.query("UPDATE servers SET channel_id = ? WHERE guild_id = ?", [channelId, guildId],
                    function (err, result, fields) {
                    console.log("Channel updated! (" + guildId + ") " + guildName + " - (" + channelId + ")");
                });
            }
        });
    } catch (error) {}
}

async function saveConfession(confession, userId, username, discriminator, guildId, status = 'SENT') {
    try {
        db.query("INSERT INTO confessions (confession, user_id, username, guild_id, status) VALUES (?, ?, ?, ?, ?)",
            [confession, userId, username + "#" + discriminator, guildId, status], function (err, result, fields) {
            console.log("Confession saved! (SERVER: " + guildId + ") - (USER: " + userId + ") " + username + "#" + discriminator + "(" + status + ")");
        });
    } catch (error) {}
}

async function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

async function setChannelError(interaction) {
    try {
        interaction.reply({content: 'You need to set a channel first!', ephemeral: true});
    } catch (error) {}
}

async function sendReply(interaction, content) {
    try {
        interaction.reply({content: content, ephemeral: true});
    } catch (error) {}
}