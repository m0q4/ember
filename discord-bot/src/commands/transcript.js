const { SlashCommandBuilder } = require('discord.js');
const ticketStore = require('../ticketStore');
const { buildTranscript } = require('../transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trascrivi')
    .setDescription('Genera e invia il trascritto del ticket corrente'),

  async execute(interaction) {
    const ticket = ticketStore.get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Questo comando puo\' essere usato solo dentro un canale ticket.', ephemeral: true });
    }

    const supportRoleId = process.env.SUPPORT_ROLE_ID;
    if (supportRoleId && !interaction.member.roles.cache.has(supportRoleId)) {
      return interaction.reply({ content: 'Non hai il ruolo staff necessario per trascrivere i ticket.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const attachment = await buildTranscript(interaction.channel);
    const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL_ID;

    if (transcriptChannelId) {
      const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelId).catch(() => null);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `Trascritto ticket **${interaction.channel.name}** (richiesto da ${interaction.user})`,
          files: [attachment],
        });
      }
    }

    return interaction.editReply({ content: 'Trascritto generato e inviato.', files: transcriptChannelId ? [] : [attachment] });
  },
};
