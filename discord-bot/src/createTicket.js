const { PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const ticketStore = require('./ticketStore');
const TICKET_TYPES = require('./ticketTypes');

// Crea il canale ticket del tipo scelto (support / buy / developer), ciascuno
// nella propria categoria Discord, con i permessi corretti per l'utente e lo staff.
async function createTicketChannel(interaction, typeId) {
  const type = TICKET_TYPES.find((t) => t.id === typeId);
  if (!type) {
    return interaction.reply({ content: 'Unknown ticket type.', ephemeral: true });
  }

  const guild = interaction.guild;
  const supportRoleId = process.env.SUPPORT_ROLE_ID;
  const categoryId = process.env[type.categoryEnv];

  const channelName = `${type.id}-${interaction.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 90);

  const existing = guild.channels.cache.find(
    (c) => c.name === channelName && ticketStore.isTicketChannel(c.id)
  );
  if (existing) {
    return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
  }

  const permissionOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
  ];

  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    permissionOverwrites,
  });

  ticketStore.create(channel.id, {
    type: type.id,
    openerId: interaction.user.id,
    assigneeId: null,
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  const embed = new EmbedBuilder()
    .setColor(0xff7a29)
    .setTitle(`Ember - ${type.label} ticket`)
    .setDescription(
      `Hi ${interaction.user}, thanks for reaching out.\n` +
        `Please describe your request and our staff will get back to you shortly.\n\n` +
        `Staff commands: \`/assegna\`, \`/trascrivi\`, \`/chiudi\``
    )
    .setTimestamp();

  await channel.send({ content: supportRoleId ? `<@&${supportRoleId}>` : undefined, embeds: [embed] });

  return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

module.exports = { createTicketChannel };
