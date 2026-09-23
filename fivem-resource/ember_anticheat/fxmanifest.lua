fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Ember Anticheat'
description 'Ember - Anticheat commerciale per server FiveM'
version '1.0.0'

client_scripts {
    'config.lua',
    'client/main.lua',
}

server_scripts {
    'config.lua',
    'server/identifiers.lua',
    'server/http.lua',
    'server/replay.lua',
    'server/admin.lua',
    'server/connecting.lua',
    'server/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
}
