const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Collega l'account Discord dell'admin alla dashboard Ember: verifica localmente il
// ruolo richiesto nel server (stesso ruolo controllato dal backend via OAuth2) e
// restituisce il link di login, che riusa lo stesso flusso OAuth2 Discord del backend.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription("Ottieni il link di accesso alla dashboard Ember (richiede il ruolo admin)"),

  async execute(interaction) {
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
    const backendUrl = process.env.BACKEND_URL;

    const hasRole = !adminRoleId || interaction.member.roles.cache.has(adminRoleId);

    if (!hasRole) {
      const embed = new EmbedBuilder()
        .setColor(0xe5484d)
        .setDescription('Non hai il ruolo richiesto per accedere alla dashboard admin di Ember.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xff7a29)
      .setTitle('Accesso Dashboard Ember')
      .setDescription(
        `Hai il ruolo richiesto. Accedi alla dashboard cliccando "Accedi con Discord":\n${backendUrl}/auth/discord/login`
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
