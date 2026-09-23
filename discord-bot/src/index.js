require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { createTicketChannel } = require('./createTicket');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`[ember-bot] Connesso come ${client.user.tag}`);
});

async function handleError(interaction, label, err) {
  console.error(`[ember-bot] Errore in ${label}`, err);
  const payload = { content: "Si e' verificato un errore durante l'esecuzione del comando.", ephemeral: true };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload).catch(() => {});
  } else {
    await interaction.reply(payload).catch(() => {});
  }
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      await handleError(interaction, `comando ${interaction.commandName}`, err);
    }
    return;
  }

  // Menu a tendina del pannello ticket fisso (customId impostato in commands/panel.js)
  if (interaction.isStringSelectMenu() && interaction.customId === 'ember_ticket_type') {
    try {
      await createTicketChannel(interaction, interaction.values[0]);
    } catch (err) {
      await handleError(interaction, 'creazione ticket dal pannello', err);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
