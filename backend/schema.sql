-- Ember Anticheat - schema PostgreSQL
-- Esegui con: psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL, -- primi caratteri della chiave, per identificarla nei log senza esporla
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bans (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE SET NULL,
    player_name TEXT,
    identifiers TEXT[] NOT NULL DEFAULT '{}', -- es: {"steam:1100...", "license:abc...", "discord:123..."}
    reason TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_identifier TEXT,
    replay JSONB NOT NULL DEFAULT '[]', -- sequenza di keyframe {t,x,y,z,heading,weapon,health,armor}
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unbanned_at TIMESTAMPTZ,
    unbanned_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bans_identifiers ON bans USING GIN (identifiers);
CREATE INDEX IF NOT EXISTS idx_bans_active ON bans (active);

CREATE TABLE IF NOT EXISTS online_players (
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL,
    name TEXT,
    steam TEXT,
    license TEXT,
    discord TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (server_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_online_players_updated ON online_players (updated_at);
