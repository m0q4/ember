-- Comunica al client se il player ha il permesso ACE di amministratore Ember,
-- cosi' il client puo' mostrare/nascondere l'accesso al menu (l'enforcement reale
-- resta lato server su ogni evento sensibile).

RegisterNetEvent('ember:checkAdmin')
AddEventHandler('ember:checkAdmin', function()
    local src = source
    TriggerClientEvent('ember:setAdminStatus', src, IsPlayerAceAllowed(src, Config.Admin.acePermission))
end)
