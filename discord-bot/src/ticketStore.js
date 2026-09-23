const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tickets.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let tickets = load();

module.exports = {
  create(channelId, ticket) {
    tickets[channelId] = ticket;
    save(tickets);
  },
  get(channelId) {
    return tickets[channelId];
  },
  update(channelId, patch) {
    if (!tickets[channelId]) return null;
    tickets[channelId] = { ...tickets[channelId], ...patch };
    save(tickets);
    return tickets[channelId];
  },
  remove(channelId) {
    delete tickets[channelId];
    save(tickets);
  },
  isTicketChannel(channelId) {
    return Boolean(tickets[channelId]);
  },
};
