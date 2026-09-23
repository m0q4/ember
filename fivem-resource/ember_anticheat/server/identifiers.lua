Ember = Ember or {}

--- Restituisce una tabella { steam=, license=, license2=, discord=, xbl=, ip=, ... }
--- con gli identifier completi (prefisso incluso) del player.
function Ember.GetIdentifiers(playerId)
    local result = {}
    local num = GetNumPlayerIdentifiers(playerId)
    for i = 0, num - 1 do
        local id = GetPlayerIdentifier(playerId, i)
        if id then
            local prefix = id:match('^(%a+):')
            if prefix then
                result[prefix] = id
            end
        end
    end
    return result
end
