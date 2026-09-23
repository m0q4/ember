const { SlashCommandBuilder } = require('discord.js');
const ticketStore = require('../ticketStore');
const { buildTranscript } = require('../transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chiudi')
    .setDescription('Chiude il ticket corrente (genera trascritto ed elimina il canale)'),

  async execute(interaction) {
    const ticket = ticketStore.get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Questo comando puo\' essere usato solo dentro un canale ticket.', ephemeral: true });
    }

    const supportRoleId = process.env.SUPPORT_ROLE_ID;
    const isStaff = !supportRoleId || interaction.member.roles.cache.has(supportRoleId);
    const isOpener = interaction.user.id === ticket.openerId;

    if (!isStaff && !isOpener) {
      return interaction.reply({ content: 'Non hai i permessi per chiudere questo ticket.', ephemeral: true });
    }

    await interaction.reply('Chiusura ticket in corso, verra\' generato il trascritto ed eliminato il canale tra 5 secondi...');

    const attachment = await buildTranscript(interaction.channel);
    const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL_ID;

    if (transcriptChannelId) {
      const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelId).catch(() => null);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `Ticket **${interaction.channel.name}** chiuso da ${interaction.user}.`,
          files: [attachment],
        });
      }
    }

    ticketStore.update(interaction.channel.id, { status: 'closed', closedBy: interaction.user.id, closedAt: new Date().toISOString() });

    setTimeout(async () => {
      ticketStore.remove(interaction.channel.id);
      await interaction.channel.delete().catch(() => {});
    }, 5000);
  },
};
