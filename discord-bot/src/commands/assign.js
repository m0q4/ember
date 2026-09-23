const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ticketStore = require('../ticketStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assegna')
    .setDescription('Assegna il ticket corrente a un membro dello staff')
    .addUserOption((opt) => opt.setName('membro').setDescription('Membro staff a cui assegnare il ticket').setRequired(true)),

  async execute(interaction) {
    const ticket = ticketStore.get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Questo comando puo\' essere usato solo dentro un canale ticket.', ephemeral: true });
    }

    const supportRoleId = process.env.SUPPORT_ROLE_ID;
    if (supportRoleId && !interaction.member.roles.cache.has(supportRoleId)) {
      return interaction.reply({ content: 'Non hai il ruolo staff necessario per assegnare i ticket.', ephemeral: true });
    }

    const member = interaction.options.getUser('membro', true);
    ticketStore.update(interaction.channel.id, { assigneeId: member.id });

    const embed = new EmbedBuilder()
      .setColor(0xff7a29)
      .setDescription(`Ticket assegnato a ${member}.`);

    return interaction.reply({ embeds: [embed] });
  },
};
