// Tipi di ticket mostrati nel menu a tendina del pannello fisso.
// Ogni tipo crea il canale in una categoria Discord diversa (vedi .env.example).
module.exports = [
  {
    id: 'support',
    label: 'Support',
    emoji: '🛠️',
    description: 'Get help with a problem on your server',
    categoryEnv: 'TICKET_CATEGORY_SUPPORT_ID',
  },
  {
    id: 'buy',
    label: 'Buy',
    emoji: '💳',
    description: 'Purchase Ember or ask about pricing',
    categoryEnv: 'TICKET_CATEGORY_BUY_ID',
  },
  {
    id: 'developer',
    label: 'Developer',
    emoji: '💻',
    description: 'Get in touch with a developer',
    categoryEnv: 'TICKET_CATEGORY_DEVELOPER_ID',
  },
];
