Config = {}

-- URL base del backend Ember (senza slash finale) e chiave API assegnata a questo server
Config.Backend = {
    url = 'http://localhost:3000',
    apiKey = 'CHANGE_ME_SERVER_API_KEY',
}

Config.Admin = {
    acePermission = 'ember.admin', -- permesso ACE richiesto per usare il menu admin
    openCommand = 'ember', -- comando per aprire il menu (/ember)
}

Config.Replay = {
    bufferSeconds = 20,
    intervalMs = 200,
}

-- Ordine con cui vengono provati gli identifier per il controllo ban alla connessione
Config.CheckIdentifiersOnConnect = { 'license', 'license2', 'steam', 'discord', 'xbl' }
