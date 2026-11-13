// Database schema. Idempotent: safe to run on every start.
export const SCHEMA = `
create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null,
  token_hash text unique,
  created_at timestamptz not null default now()
);

create table if not exists locales (
  code text primary key,
  market text not null,
  language text not null,
  currency text not null,
  fallback text references locales(code),
  pack text,
  rtl boolean not null default false,
  is_source boolean not null default false
);

create table if not exists content_types (
  id text primary key,
  name text not null,
  kind text not null default 'collection',
  requires_legal boolean not null default false,
  fields jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  type_id text not null references content_types(id),
  title text not null,
  slug text not null unique,
  stage text not null default 'Draft',
  author_id text not null references users(id),
  source_rev int not null default 1,
  version int not null default 1,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists entry_locales (
  entry_id uuid not null references entries(id) on delete cascade,
  locale text not null references locales(code),
  fields jsonb not null default '{}',
  status text not null default 'current',
  source_rev int not null default 0,
  updated_by text references users(id),
  updated_at timestamptz not null default now(),
  primary key (entry_id, locale)
);

create table if not exists entry_versions (
  entry_id uuid not null references entries(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  note text,
  created_by text references users(id),
  created_at timestamptz not null default now(),
  primary key (entry_id, version)
);

create table if not exists published_entries (
  entry_id uuid primary key references entries(id) on delete cascade,
  snapshot jsonb not null,
  published_by text references users(id),
  published_at timestamptz not null default now()
);

create table if not exists alert_templates (
  id text primary key,
  name text not null,
  severity int not null,
  title text not null,
  body text not null
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  severity int not null check (severity between 1 and 3),
  title text not null,
  body text not null,
  airports jsonb not null default '[]',
  channels jsonb not null default '[]',
  deliveries jsonb not null default '[]',
  template_id text references alert_templates(id),
  published_by text not null references users(id),
  published_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_by text references users(id)
);

create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_id text not null,
  actor_name text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  target_label text not null default '',
  detail jsonb not null default '{}'
);

create or replace function audit_log_immutable() returns trigger as $$
begin
  raise exception 'audit_log is append-only';
end;
$$ language plpgsql;

drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log
  for each row execute function audit_log_immutable();
`
