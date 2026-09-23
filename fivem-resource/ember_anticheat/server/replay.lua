-- Replay-logger: registra ogni 200ms (configurabile) un keyframe (posizione, rotazione,
-- arma, salute/armor) per ogni player connesso in un buffer circolare per player.
-- FiveM non offre una vera registrazione video: questo buffer viene inviato al backend
-- al momento del ban e la dashboard lo ricostruisce come replay 2D/3D.

Ember = Ember or {}
Ember.Replay = {}

local buffers = {}
local maxEntries = math.max(1, math.floor((Config.Replay.bufferSeconds * 1000) / Config.Replay.intervalMs))

local function pushFrame(playerId)
    if GetPlayerName(playerId) == nil then return end

    local ped = GetPlayerPed(playerId)
    if not ped or ped == 0 then return end

    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local weaponHash = GetSelectedPedWeapon(ped)
    local health = GetEntityHealth(ped)
    local armor = GetPedArmour(ped)

    buffers[playerId] = buffers[playerId] or {}
    local buf = buffers[playerId]

    buf[#buf + 1] = {
        t = GetGameTimer(),
        x = coords.x,
        y = coords.y,
        z = coords.z,
        heading = heading,
        weapon = weaponHash,
        health = health,
        armor = armor,
    }

    if #buf > maxEntries then
        table.remove(buf, 1)
    end
end

CreateThread(function()
    while true do
        Wait(Config.Replay.intervalMs)
        for _, playerId in ipairs(GetPlayers()) do
            pushFrame(tonumber(playerId))
        end
    end
end)

--- Ritorna la sequenza di keyframe registrata per il player (ultimi N secondi).
function Ember.Replay.GetBuffer(playerId)
    return buffers[playerId] or {}
end

AddEventHandler('playerDropped', function()
    local src = source
    buffers[src] = nil
end)
