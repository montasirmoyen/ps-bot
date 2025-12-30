const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SCRIM_ROLE_ID = '1391925544869957745';
const SCRIM_CHANNEL_ID = '1449624230391185501';
const REQUIRED_ROLE_ID = '1455664138150744105';
const STAFF_ROLE_ID = '1385069589054095531';

const cooldowns = new Map();
const COOLDOWN_TIME = 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scrim')
    .setDescription('Announce that you are hosting a scrim')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('What is the name of the server? Type :sinfo in-game to find it.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('region')
        .setDescription('What is the region of the server? Type :sinfo in-game to find it.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('OPTIONAL: Is there a code to enter the server?')
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const member = interaction.guild.members.cache.get(userId);

    if (!member.roles.cache.has(REQUIRED_ROLE_ID) || !member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    const now = Date.now();

    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        return interaction.reply({ content: `⏳ Please wait ${timeLeft} more second(s) before using this command again.`, ephemeral: true });
      }
    }

    const user = interaction.user;
    const svName = interaction.options.getString('name');
    const svRegion = interaction.options.getString('region');
    const svCode = interaction.options.getString('code');

    cooldowns.set(userId, now);

    const displayName = member ? member.displayName : user.username;

    let pingString = `<@${userId}> <@&${SCRIM_ROLE_ID}>`;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp()
      .setFooter({
        text: 'Pure Sports - ' + new Date().toLocaleString(),
        iconURL: 'https://cdn.discordapp.com/attachments/1455665134902051051/1455665224966209617/PS_LOGO_WHITE.webp?ex=69558d62&is=69543be2&hm=a4211aece09f511a0ee5a976a108664ad0ccb471073d2de517c47c6bd841659b&'
      })
      .setAuthor({ name: displayName, iconURL: user.displayAvatarURL({ extension: 'png', size: 128 }) });

    embed.setTitle(`**${managerData.team}** is hosting a scrim!`)
      .addFields(
        { name: 'Server Name', value: svName, inline: true },
        { name: 'Region', value: svRegion, inline: true },
        ...(svCode ? [{ name: 'Code', value: svCode, inline: true }] : []),
      );

    try {
      const channel = await interaction.client.channels.fetch(SCRIM_CHANNEL_ID);
      await channel.send({ content: pingString, embeds: [embed] });
      await interaction.reply({ content: '✅ Your scrim announcement has been sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending scrim message:', error);
      cooldowns.delete(userId);
      await interaction.reply({ content: '⚠️ Failed to send scrim announcement.', ephemeral: true });
    }
  }
};
