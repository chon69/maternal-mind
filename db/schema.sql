-- Maternal Mind - PostgreSQL Schema
-- Run once: psql $DATABASE_URL -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS usuarios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT        NOT NULL,
  email            TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL DEFAULT '',
  role             TEXT        NOT NULL DEFAULT 'client',
  estado           TEXT        NOT NULL DEFAULT 'pendiente',
  token_activacion TEXT        NOT NULL DEFAULT '',
  token_expiry     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login       TIMESTAMPTZ,
  plan             TEXT        NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS articulos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT        NOT NULL,
  slug          TEXT        UNIQUE NOT NULL,
  descripcion   TEXT        NOT NULL DEFAULT '',
  contenido_html TEXT       NOT NULL DEFAULT '',
  imagen_url    TEXT        NOT NULL DEFAULT '',
  url_substack  TEXT        NOT NULL DEFAULT '',
  categoria     TEXT        NOT NULL DEFAULT 'general',
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcast (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT        NOT NULL,
  descripcion     TEXT        NOT NULL DEFAULT '',
  numero_episodio INTEGER     NOT NULL DEFAULT 0,
  temporada       INTEGER     NOT NULL DEFAULT 1,
  url_spotify     TEXT        NOT NULL DEFAULT '',
  url_apple       TEXT        NOT NULL DEFAULT '',
  url_ivoox       TEXT        NOT NULL DEFAULT '',
  imagen_url      TEXT        NOT NULL DEFAULT '',
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eventos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT        NOT NULL,
  descripcion     TEXT        NOT NULL DEFAULT '',
  tipo            TEXT        NOT NULL DEFAULT 'taller',
  fecha_inicio    DATE,
  fecha_fin       DATE,
  hora_inicio     TEXT        NOT NULL DEFAULT '',
  hora_fin        TEXT        NOT NULL DEFAULT '',
  precio          NUMERIC     NOT NULL DEFAULT 0,
  moneda          TEXT        NOT NULL DEFAULT 'EUR',
  url_inscripcion TEXT        NOT NULL DEFAULT '',
  imagen_url      TEXT        NOT NULL DEFAULT '',
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  destacado       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imagen_posicion TEXT        NOT NULL DEFAULT 'center'
);

CREATE TABLE IF NOT EXISTS recursos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT        NOT NULL,
  descripcion  TEXT        NOT NULL DEFAULT '',
  tipo         TEXT        NOT NULL DEFAULT '',
  modulo       TEXT        NOT NULL DEFAULT '',
  modulo_nombre TEXT       NOT NULL DEFAULT '',
  orden        INTEGER     NOT NULL DEFAULT 0,
  contenido    TEXT        NOT NULL DEFAULT '',
  url_archivo  TEXT        NOT NULL DEFAULT '',
  duracion     TEXT        NOT NULL DEFAULT '',
  activo       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  premium      BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS plantillas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  asunto      TEXT        NOT NULL DEFAULT '',
  cuerpo_html TEXT        NOT NULL DEFAULT '',
  tipo        TEXT        NOT NULL DEFAULT '',
  activo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comunidad (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id     TEXT        NOT NULL DEFAULT '',
  autor_nombre TEXT        NOT NULL DEFAULT '',
  categoria    TEXT        NOT NULL DEFAULT '',
  contenido    TEXT        NOT NULL DEFAULT '',
  activo       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     TEXT        NOT NULL DEFAULT '',
  cliente_nombre TEXT        NOT NULL DEFAULT '',
  cliente_email  TEXT        NOT NULL DEFAULT '',
  asunto         TEXT        NOT NULL DEFAULT '',
  contenido      TEXT        NOT NULL DEFAULT '',
  respuesta      TEXT        NOT NULL DEFAULT '',
  estado         TEXT        NOT NULL DEFAULT 'pendiente',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondido_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL      PRIMARY KEY,
  nombre     TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
