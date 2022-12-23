import {SlashCommandBuilder} from "@discordjs/builders";

const commands = [
    {
        name: 'help',
        description: 'List of commands',
    },
    {
        name: 'invite',
        description: 'Gives invite link of the bot',
    },
    {
        name: 'setchannel',
        description: 'Sets the channel for the bot to send messages in',
    },
    {
        name: 'confess',
        description: 'Allows you to confess!',
    }
];

const customizeCommand = new SlashCommandBuilder()
    .setName('customize')
    .setDescription('Customize the bot')
    .addSubcommand(subcommand =>
        subcommand
            .setName('title')
            .setDescription('Change the title of confessions. Default: "New Confession!"')
            .addStringOption(option =>
                option
                    .setName('title')
                    .setDescription("your title")
                    .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('color')
            .setDescription('Change confessions color')
            .addStringOption(option =>
                option
                    .setName('color')
                    .setDescription("color in hex format (eg. #FFFFFF)")
                    .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('footer')
            .setDescription('Change the footer text')
            .addStringOption(option =>
                option
                    .setName('footer')
                    .setDescription("your custom text")
                    .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('reset')
            .setDescription('Reset bot\'s customization')
    );

export const allCommands = [customizeCommand.toJSON(), ...commands];
