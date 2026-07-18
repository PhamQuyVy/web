create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_lookup char(64) unique,
  full_name text not null,
  password_hash text,
  avatar_url text,
  provider text default 'email',
  provider_account_id text,
  phone_encrypted text,
  address_encrypted text,
  oauth_refresh_token_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_users_provider_account
  on users(provider, provider_account_id);

create table if not exists sessions (
  id char(64) primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists ix_sessions_user_id on sessions(user_id);
create index if not exists ix_sessions_expires_at on sessions(expires_at);

create table if not exists user_progress (
  user_id uuid primary key references users(id) on delete cascade,
  completed_lesson_ids jsonb not null default '[]'::jsonb,
  lesson_completions jsonb not null default '{}'::jsonb,
  quiz_attempts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists user_logins (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  login_provider text not null,
  logged_in_at timestamptz not null default now(),
  ip_address_hash char(64),
  user_agent text
);

create index if not exists ix_user_logins_user_id_logged_in_at
  on user_logins(user_id, logged_in_at desc);

create index if not exists ix_user_logins_logged_in_at
  on user_logins(logged_in_at desc);

update users
set password_hash = null,
    updated_at = now()
where provider in ('google', 'facebook')
  and password_hash is not null;
