import {client} from "./init.js";
import {db} from "../config/mysql.js";
import {PermissionsBitField, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder} from "discord.js";
import { randomEmoji } from "../libs/random-emoji.js";

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setchannel') {
        if (await hasMessagePermission(interaction.channel)) {
            await setChannel(interaction.guild.id, interaction.guild.name, interaction.channel.id);
            interaction.reply('Channel set!');
        } else {
            console.log("No permission to send messages in this channel :(");
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
                            //interaction.deferReply('Getting server list...');

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

                            await interaction.followUp({embeds: [serverSelectEmbed], components: [selectAction]});

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
                                                await interaction.followUp('Confession sent! \nCheck it out : ' + serverChannel.toString());
                                            } else {
                                                await saveConfession(confession, interaction.user.id, interaction.user.username, interaction.user.discriminator, guildId, 'ERROR');
                                                await interaction.followUp('Error: Channel not found');
                                            }
                                        }
                                    } else {
                                        await interaction.followUp({content: 'Error: This server is not configured yet! Please contact their admins.'});
                                    }
                                });
                        })
                        .catch(collected => {
                            interaction.followUp('Error, type the /confess command again please.');
                        });

                });
        } else {
            interaction.channel.send("You can only use this command in DMs!");
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
    db.query("SELECT * FROM servers WHERE guild_id = ?", [guildId], (err, result) => {
        if (result[0] == null) {
            db.query("INSERT INTO servers (guild_id, guild_name, channel_id) VALUES ('" + guildId + "', '" + guildName + "', '" + channelId + "')", function (err, result, fields) {
                if (err) throw err;
                console.log("Channel set! (" + guildId + ") " + guildName + " - (" + channelId + ")");
            });
        }else {
            db.query("UPDATE servers SET channel_id = '" + channelId + "' WHERE guild_id = '" + guildId + "'", function (err, result, fields) {
                if (err) throw err;
                console.log("Channel updated! (" + guildId + ") " + guildName + " - (" + channelId + ")");
            });
        }
    });
}

async function saveConfession(confession, userId, username, discriminator, guildId, status = 'SENT') {
    db.query("INSERT INTO confessions (confession, user_id, username, guild_id, status) VALUES ('" + confession + "', '" + userId + "', '" + username + "#" + discriminator + "', '" + guildId + "', '" + status + "')", function (err, result, fields) {
        if (err) throw err;
        console.log("Confession saved! (SERVER: " + guildId + ") - (USER: " + userId + ") " + username + "#" + discriminator + "(" + status + ")");
    });
}