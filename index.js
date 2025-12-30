const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  Events,
  EmbedBuilder
} = require('discord.js');

const emojiMap = {};

require('dotenv').config();

const ANNOUNCE_CHANNEL_ID = '1385073502213767248';
const MINIMUM_ROLE_ID = '1384791347357155439';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

const app = express();
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(PORT, () => console.log(`Uptime server is running on port ${PORT}`));

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    status: 'online',
    activities: [{
      name: 'Pure Soccer',
      type: ActivityType.Playing
    }]
  });
  console.log('Bot status set to DND with /help activity');
});

client.on(Events.InteractionCreate, async interaction => {
  try {
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
          text: member.displayName,
          iconURL: member.displayAvatarURL({ extension: 'png', size: 64 })
        });

      try {
        const announceChannel = await interaction.client.channels.fetch(ANNOUNCE_CHANNEL_ID);
        await announceChannel.send({ content: 'Official Statement', embeds: [embed] });
        await interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
      } catch (error) {
        console.error('Error sending announcement:', error);
        await interaction.reply({ content: '⚠️ Failed to send the announcement.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Error handling interaction:', err);

    const errorMessage = {
      content: `❌ There was an error:\n\`\`\`${err.stack || err.message}\`\`\``,
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

client.login(process.env.TOKEN);