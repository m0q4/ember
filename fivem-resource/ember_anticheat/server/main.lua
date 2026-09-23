-- Menu admin: lista player online + ban (con conferma e motivo lato NUI).

RegisterCommand(Config.Admin.openCommand, function() end, false) -- solo per registrare il comando in fxmanifest/help, la logica reale e' lato client

RegisterServerEvent('ember:requestPlayerList')
AddEventHandler('ember:requestPlayerList', function()
    local src = source
    if not IsPlayerAceAllowed(src, Config.Admin.acePermission) then return end

    local players = {}
    for _, playerId in ipairs(GetPlayers()) do
        playerId = tonumber(playerId)
        local ids = Ember.GetIdentifiers(playerId)
        players[#players + 1] = {
            serverId = playerId,
            name = GetPlayerName(playerId),
            steam = ids.steam,
            license = ids.license,
            discord = ids.discord,
        }
    end

    TriggerClientEvent('ember:receivePlayerList', src, players)
end)

RegisterServerEvent('ember:banPlayer')
AddEventHandler('ember:banPlayer', function(targetServerId, reason)
    local src = source
    if not IsPlayerAceAllowed(src, Config.Admin.acePermission) then return end

    targetServerId = tonumber(targetServerId)
    if not targetServerId or GetPlayerName(targetServerId) == nil then
        TriggerClientEvent('ember:banResult', src, false, 'Player non trovato.')
        return
    end

    if not reason or reason:gsub('%s', '') == '' then
        TriggerClientEvent('ember:banResult', src, false, 'Il motivo del ban e\' obbligatorio.')
        return
    end

    local targetIds = Ember.GetIdentifiers(targetServerId)
    local adminIds = Ember.GetIdentifiers(src)
    local targetName = GetPlayerName(targetServerId)
    local replay = Ember.Replay.GetBuffer(targetServerId)

    local payload = {
        playerName = targetName,
        identifiers = targetIds,
        reason = reason,
        admin = GetPlayerName(src),
        adminIdentifier = adminIds.license or adminIds.discord or 'unknown',
        timestamp = os.time(),
        replay = replay,
    }

    EmberHttp.Post('/ban', payload, function(success, _data)
        if success then
            DropPlayer(targetServerId, ('Sei stato bannato da Ember Anticheat.\nMotivo: %s'):format(reason))
        end
        TriggerClientEvent(
            'ember:banResult',
            src,
            success,
            success and 'Player bannato con successo.' or 'Errore nel salvataggio del ban sul backend.'
        )
    end)
end)

-- Sincronizza periodicamente la lista dei player online con il backend, cosi'
-- la dashboard web puo' mostrarli anche fuori dal menu in-game.
CreateThread(function()
    while true do
        Wait(15000)

        local players = {}
        for _, playerId in ipairs(GetPlayers()) do
            playerId = tonumber(playerId)
            local ids = Ember.GetIdentifiers(playerId)
            players[#players + 1] = {
                sourceId = playerId,
                name = GetPlayerName(playerId),
                steam = ids.steam,
                license = ids.license,
                discord = ids.discord,
            }
        end

        EmberHttp.Post('/players/sync', { players = players })
    end
end)
