const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const TICKET_TYPES = require('../ticketTypes');

// Invia nel canale corrente il pannello fisso per l'apertura dei ticket:
// resta li' permanentemente, gli utenti scelgono il tipo dal menu a tendina.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription("Invia il pannello fisso per l'apertura dei ticket in questo canale")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const supportRoleId = process.env.SUPPORT_ROLE_ID;
    const hasStaffRole = supportRoleId && interaction.member.roles.cache.has(supportRoleId);
    const hasManageChannels = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

    if (!hasStaffRole && !hasManageChannels) {
      return interaction.reply({ content: 'Non hai i permessi per inviare il pannello ticket.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xff7a29)
      .setTitle('Ember Support')
      .setDescription('Select a category below to open a private ticket with our team.')
      .setFooter({ text: 'Ember Anticheat' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ember_ticket_type')
      .setPlaceholder('Select a ticket type...')
      .addOptions(
        TICKET_TYPES.map((t) => ({
          label: t.label,
          value: t.id,
          description: t.description,
          emoji: t.emoji,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: 'Panel sent.', ephemeral: true });
  },
};
