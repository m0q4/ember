-- Alla connessione: cattura tutti gli identifier e li invia al backend, poi verifica
-- se il player e' bannato su QUALSIASI server della rete Ember (ban condiviso).

AddEventHandler('playerConnecting', function(name, _setKickReason, deferrals)
    local src = source
    deferrals.defer()

    Wait(0)
    deferrals.update('Ember Anticheat: verifica identificativi in corso...')

    local identifiers = Ember.GetIdentifiers(src)

    -- Invio identifier al backend (fire and forget, non blocca la connessione)
    EmberHttp.Post('/identify', {
        name = name,
        identifiers = identifiers,
    })

    local checkValue = nil
    for _, key in ipairs(Config.CheckIdentifiersOnConnect) do
        if identifiers[key] then
            checkValue = identifiers[key]
            break
        end
    end

    if not checkValue then
        deferrals.done()
        return
    end

    local finished = false
    local banned = false
    local reason = nil

    EmberHttp.Get('/check/' .. checkValue, function(success, data)
        if success and data and data.banned then
            banned = true
            reason = data.reason
        end
        finished = true
    end)

    local waited = 0
    while not finished and waited < 5000 do
        Wait(50)
        waited = waited + 50
    end

    if banned then
        deferrals.done(('[Ember Anticheat]\nSei bannato da questo network.\nMotivo: %s'):format(reason or 'Non specificato'))
    else
        deferrals.done()
    end
end)
