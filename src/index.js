import {client} from "./init.js";
import {db} from "../config/mysql.js";
import {PermissionsBitField, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder} from "discord.js";
import { randomEmoji } from "../libs/random-emoji.js";

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'invite') {
        if (interaction.channel.type === 1) {
            try {
                interaction.reply('https://discord.com/api/oauth2/authorize?client_id=796832150853779456&permissions=19456&redirect_uri=https%3A%2F%2Fconfess.diyar.dev&response_type=code&scope=messages.read%20applications.commands%20bot')
            } catch (error) {
                console.log(error);
            }
        }
    }


    if (interaction.commandName === 'help') {

        const helpMsgEmbed = new EmbedBuilder()
            .setTitle('Confess Bot')
            .setDescription('Confess Bot is a bot that allows you to confess anonymously!')
            .addFields(
                {name: '--------------------------', value: '**Commands :**'},
                {name: '```/help```', value: 'Help command for the bot'},
                {name: '```/setchannel```', value: 'Sets the channel for the bot to send messages in'},
                {name: '```/confess```', value: 'Allows you to confess! (Use this only in DMs)'},
                {name: '```/invite```', value: 'Invite link for the bot (Use this only in DMs)'},
                {name: '--------------------------', value:'Make sure to enable the "Allow direct messages from server members" option in your settings!'},
                {name: 'Need more help ?', value: 'contact@diyar.dev or 10YAR#0001'}
            );
        try {
            interaction.reply({embeds: [helpMsgEmbed]});
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'setchannel') {
        if (await hasMessagePermission(interaction.channel)) {
            await setChannel(interaction.guild.id, interaction.guild.name, interaction.channel.id);
            try {
                interaction.reply('Channel set!');
            } catch (error) {
                console.error(error);
            }
        }
    }

    if (interaction.commandName === 'confess') {
        if (interaction.channel.type === 1) {

            // STEP 1 : Write the Confession
            const msgEmbed = await new EmbedBuilder()
                .setTitle("Tell me what's on your mind! " + randomEmoji())
                .setDescription("Please write your confession below.\n You can use *markdown* to format your message.\n\n Your confession is fully anonym. You have 15min to write it (otherwise you'd have to type the command again)");

            interaction.reply({embeds: [msgEmbed], fetchReply: true})
                .then(async () => {
                    // STEP 2 : Select a server & Confirm Confession
                    interaction.channel.awaitMessages({max: 1, time: 900000, errors: ['time']})
                        .then(async collected => {

                            const guilds = [];
                            for (const [, guild] of interaction.client.guilds.cache) {
                                await guild.members.fetch(interaction.user).then(() => guilds.push(guild)).catch(error => console.log(error));
                            }

                            const selectServers = [];
                            for (let i = 0; i < Object.keys(guilds).length; i++) {
                                selectServers.push({label: Object.entries(guilds)[i][1].name, value: Object.entries(guilds)[i][1].id});
                            }

                            const confession = collected.first().content;
                            const serverSelectEmbed = new EmbedBuilder()
                                .setTitle("Select the server you want the confession to be posted on");

                            const selectAction = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId('selectServer')
                                        .setPlaceholder('Nothing selected')
                                        .addOptions(...selectServers)
                                );

                            try {
                                await interaction.followUp({embeds: [serverSelectEmbed], components: [selectAction]});
                            } catch (error) {
                                console.error(error);
                            }

                            // STEP 4 : Sending and Saving Confession
                            interaction.channel.awaitMessageComponent({componentType: 3, time: 15000})
                                .then(async collected => {
                                    collected.deferUpdate();

                                    const guildId = collected.values[0];

                                    const guildRes = await checkGuildExist(guildId);
                                    console.log(guildRes);
                                    if (guildRes[0] != null) {
                                        const serverGuild = await client.guilds.cache.get(guildId);
                                        if (serverGuild != null) {

                                            const serverChannel = await serverGuild.channels.fetch(guildRes[0].channel_id);

                                            if (serverChannel != null) {
                                                const confessionEmbed = new EmbedBuilder()
                                                    .setTitle("New confession !")
                                                    .setDescription(confession);
                                                await serverChannel.send({embeds: [confessionEmbed]});
                                                await saveConfession(confession, interaction.user.id, interaction.user.username, interaction.user.discriminator, guildId, 'SENT');

                                                try {
                                                    await interaction.followUp('Confession sent! \nCheck it out : ' + serverChannel.toString());
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                            } else {
                                                await saveConfession(confession, interaction.user.id, interaction.user.username, interaction.user.discriminator, guildId, 'ERROR');
                                                try {
                                                    await interaction.followUp('Error: Channel not found');
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                            }
                                        }
                                    } else {
                                        try {
                                            await interaction.followUp({content: 'Error: This server is not configured yet! Please contact their admins.'});
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    }
                                });
                        })
                        .catch(collected => {
                            try {
                                interaction.followUp('Error, type the /confess command again please.');
                            } catch (error) {
                                console.error(error);
                            }
                        });

                });
        } else {
            try {
                interaction.channel.send("You can only use this command in DMs!");
            } catch (error) {
                console.error(error);
            }
        }
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

async function hasMessagePermission(channel) {
    return channel.permissionsFor(client.user.id).has(PermissionsBitField.Flags.SendMessages);
}

async function setChannel(guildId, guildName, channelId) {
    try {
        db.query("SELECT * FROM servers WHERE guild_id = ?", [guildId], (err, result) => {
            if (result[0] == null) {
                db.query("INSERT INTO servers (guild_id, guild_name, channel_id) VALUES ('" + guildId + "', '" + guildName + "', '" + channelId + "')", function (err, result, fields) {
                    if (err) throw err;
                    console.log("Channel set! (" + guildId + ") " + guildName + " - (" + channelId + ")");
                });
            } else {
                db.query("UPDATE servers SET channel_id = '" + channelId + "' WHERE guild_id = '" + guildId + "'", function (err, result, fields) {
                    if (err) throw err;
                    console.log("Channel updated! (" + guildId + ") " + guildName + " - (" + channelId + ")");
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

async function saveConfession(confession, userId, username, discriminator, guildId, status = 'SENT') {
    try {
        db.query("INSERT INTO confessions (confession, user_id, username, guild_id, status) VALUES ('" + confession + "', '" + userId + "', '" + username + "#" + discriminator + "', '" + guildId + "', '" + status + "')", function (err, result, fields) {
            if (err) throw err;
            console.log("Confession saved! (SERVER: " + guildId + ") - (USER: " + userId + ") " + username + "#" + discriminator + "(" + status + ")");
        });
    } catch (error) {
        console.log(error);
    }
}