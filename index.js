import { Client, Collection, GatewayIntentBits, REST, Routes, ActivityType, Events, EmbedBuilder } from 'discord.js';

const emojiMap = {};

import dotenv from 'dotenv';
dotenv.config();
import { readdirSync } from 'fs';
import express from 'express';

const ANNOUNCE_CHANNEL_ID = '1385073502213767248';
const MINIMUM_ROLE_ID = '1384791347357155439';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const app = express();
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(PORT, () => console.log(`Uptime server is running on port ${PORT}`));

(async () => {
  // Load all commands first
  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    // Handle named exports (export const data = ..., export async function execute)
    if (command.data) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else if (command.default && command.default.data) {
      // Handle default exports (export default { data, execute })
      commands.push(command.default.data.toJSON());
      client.commands.set(command.default.data.name, command.default);
    }
  }

  // Register commands after they're all loaded
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
  } catch (error) {
    console.error('Error refreshing commands:', error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'Pure Soccer',
      type: ActivityType.Playing
    }]
  });
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'announceModal') {
      const member = interaction.member;
      const guild = interaction.guild;

      const requiredRole = guild.roles.cache.get(MINIMUM_ROLE_ID);
      if (!requiredRole || member.roles.highest.comparePositionTo(requiredRole) < 0) {
        return interaction.reply({ content: '🚫 You do not have permission.', ephemeral: true });
      }

      let message = interaction.fields.getTextInputValue('announcementInput');

      for (const [shortcut, emoji] of Object.entries(emojiMap)) {
        message = message.replaceAll(shortcut, emoji);
      }

      const embed = new EmbedBuilder()
        .setColor('#f2f2f2')
        .setDescription(message)
        .setTimestamp()
        .setFooter({
          text: member.displayName + " - President of Pure Sports",
          iconURL: member.displayAvatarURL({ extension: 'png', size: 64 })
        });

      try {
        const announceChannel = await interaction.client.channels.fetch(ANNOUNCE_CHANNEL_ID);
        await announceChannel.send({ content: '# <:PS_LOGO_WHITE:1385067881661861978> Official Statement', embeds: [embed] });
        await interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
      } catch (error) {
        console.error('Error sending announcement:', error);
        await interaction.reply({ content: '⚠️ Failed to send the announcement.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Error handling interaction:', err);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp('Internal error occured');
    } else {
      await interaction.reply('Internal error occured');
    }
  }
});

client.login(process.env.TOKEN);