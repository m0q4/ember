local isAdmin = false
local menuOpen = false

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    TriggerServerEvent('ember:checkAdmin')
end)

RegisterNetEvent('ember:setAdminStatus', function(status)
    isAdmin = status
end)

RegisterCommand(Config.Admin.openCommand, function()
    if menuOpen then return end
    if not isAdmin then
        TriggerEvent('chat:addMessage', {
            args = { 'Ember', 'Non hai i permessi per usare il menu admin.' },
        })
        return
    end
    TriggerServerEvent('ember:requestPlayerList')
end, false)

RegisterNetEvent('ember:receivePlayerList', function(players)
    menuOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', players = players })
end)

RegisterNetEvent('ember:banResult', function(success, message)
    SendNUIMessage({ action = 'banResult', success = success, message = message })
end)

RegisterNUICallback('close', function(_data, cb)
    menuOpen = false
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('refresh', function(_data, cb)
    TriggerServerEvent('ember:requestPlayerList')
    cb('ok')
end)

RegisterNUICallback('banPlayer', function(data, cb)
    TriggerServerEvent('ember:banPlayer', data.serverId, data.reason)
    cb('ok')
end)

-- Chiusura di sicurezza col tasto ESC gestita anche lato client (oltre che nella UI)
CreateThread(function()
    while true do
        Wait(0)
        if menuOpen then
            if IsControlJustPressed(0, 322) then -- ESC
                menuOpen = false
                SetNuiFocus(false, false)
                SendNUIMessage({ action = 'close' })
            end
        else
            Wait(250)
        end
    end
end)
