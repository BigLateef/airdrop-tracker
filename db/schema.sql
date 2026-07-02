-- Airdrop Tracker schema — run this once against your Neon database.
-- psql "$DATABASE_URL" -f db/schema.sql

create table if not exists wallets (
  id serial primary key,
  address text not null unique,
  label text,
  created_at timestamptz not null default now()
);

-- One row per (wallet, protocol) the crawler has detected/confirmed eligibility for.
create table if not exists wallet_protocols (
  id serial primary key,
  wallet_id integer not null references wallets(id) on delete cascade,
  protocol_slug text not null,
  first_interaction timestamptz,
  last_interaction timestamptz,
  tx_count integer not null default 0,
  detected_at timestamptz not null default now(),
  unique (wallet_id, protocol_slug)
);

-- Points history — one row per crawl per wallet+protocol. This is what powers
-- "current points" (latest row) and trend charts (all rows).
create table if not exists point_snapshots (
  id serial primary key,
  wallet_id integer not null references wallets(id) on delete cascade,
  protocol_slug text not null,
  points numeric,
  source text not null default 'unknown', -- 'api' | 'onchain' | 'manual' | 'unavailable'
  captured_at timestamptz not null default now()
);
create index if not exists idx_point_snapshots_lookup
  on point_snapshots (wallet_id, protocol_slug, captured_at desc);

-- Manual point entries for protocols with no accessible public API.
-- Latest row per (wallet, protocol) is treated as current.
create table if not exists manual_points (
  id serial primary key,
  wallet_id integer not null references wallets(id) on delete cascade,
  protocol_slug text not null,
  points numeric not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (wallet_id, protocol_slug)
);

-- Simple task checklist per protocol (user-maintained, not auto-detected).
create table if not exists tasks (
  id serial primary key,
  wallet_id integer not null references wallets(id) on delete cascade,
  protocol_slug text not null,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row, updated in place, holding the last sybil risk assessment per wallet.
create table if not exists sybil_scores (
  wallet_id integer primary key references wallets(id) on delete cascade,
  score integer not null,      -- 0 (low risk) - 100 (high risk)
  reasons jsonb not null default '[]',
  computed_at timestamptz not null default now()
);
