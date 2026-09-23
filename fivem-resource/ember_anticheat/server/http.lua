EmberHttp = EmberHttp or {}

local function buildHeaders()
    return {
        ['Content-Type'] = 'application/json',
        ['X-Api-Key'] = Config.Backend.apiKey,
    }
end

--- POST asincrono verso il backend Ember. cb(success, data) opzionale.
function EmberHttp.Post(path, body, cb)
    PerformHttpRequest(Config.Backend.url .. path, function(statusCode, response, _headers)
        local ok = statusCode ~= nil and statusCode >= 200 and statusCode < 300
        local data = nil
        if response and response ~= '' then
            local success, decoded = pcall(json.decode, response)
            if success then data = decoded end
        end
        if cb then cb(ok, data) end
    end, 'POST', json.encode(body or {}), buildHeaders())
end

--- GET asincrono verso il backend Ember. cb(success, data) obbligatorio.
function EmberHttp.Get(path, cb)
    PerformHttpRequest(Config.Backend.url .. path, function(statusCode, response, _headers)
        local ok = statusCode ~= nil and statusCode >= 200 and statusCode < 300
        local data = nil
        if response and response ~= '' then
            local success, decoded = pcall(json.decode, response)
            if success then data = decoded end
        end
        if cb then cb(ok, data) end
    end, 'GET', '', buildHeaders())
end
