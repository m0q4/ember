const { AttachmentBuilder } = require('discord.js');

// Genera un trascritto testuale del canale ticket (ultimi 500 messaggi) e lo
// impacchetta come allegato .txt, per essere inviato nel canale trascrizioni.
async function buildTranscript(channel) {
  const messages = [];
  let lastId;

  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;
    messages.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = messages.map((m) => {
    const time = new Date(m.createdTimestamp).toISOString();
    const content = m.content || '[embed/allegato]';
    return `[${time}] ${m.author.tag}: ${content}`;
  });

  const text = lines.join('\n') || 'Nessun messaggio nel ticket.';
  return new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `${channel.name}-transcript.txt` });
}

module.exports = { buildTranscript };
