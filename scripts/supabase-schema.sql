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

alter table users
  add column if not exists role text not null default 'USER';

create index if not exists ix_users_provider_account
  on users(provider, provider_account_id);

create table if not exists user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  provider_email text,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id),
  unique (user_id, provider)
);

insert into user_identities (user_id, provider, provider_account_id, provider_email, email_verified)
select id, provider, provider_account_id, email, true
from users
where provider in ('google', 'facebook')
  and provider_account_id is not null
on conflict (provider, provider_account_id) do nothing;

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

create table if not exists rate_limit_buckets (
  key_hash char(64) primary key,
  request_count integer not null default 1,
  reset_at timestamptz not null
);

create index if not exists ix_rate_limit_buckets_reset_at
  on rate_limit_buckets(reset_at);

update users
set password_hash = null,
    updated_at = now()
where provider in ('google', 'facebook')
  and password_hash is not null;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trg_user_progress_updated_at on user_progress;
create trigger trg_user_progress_updated_at
before update on user_progress
for each row
execute function set_updated_at();

drop trigger if exists trg_user_identities_updated_at on user_identities;
create trigger trg_user_identities_updated_at
before update on user_identities
for each row
execute function set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_users_provider'
  ) then
    alter table users
      add constraint chk_users_provider
      check (provider in ('email', 'google', 'facebook'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_users_role'
  ) then
    alter table users
      add constraint chk_users_role
      check (role in ('USER', 'MODERATOR', 'ADMIN'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_user_identities_provider'
  ) then
    alter table user_identities
      add constraint chk_user_identities_provider
      check (provider in ('google', 'facebook'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_users_password_provider'
  ) then
    alter table users
      add constraint chk_users_password_provider
      check (
        provider = 'email'
        or (provider in ('google', 'facebook') and password_hash is null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_user_logins_provider'
  ) then
    alter table user_logins
      add constraint chk_user_logins_provider
      check (login_provider in ('email', 'google', 'facebook'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_sessions_id_sha256'
  ) then
    alter table sessions
      add constraint chk_sessions_id_sha256
      check (id ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_user_logins_ip_hash'
  ) then
    alter table user_logins
      add constraint chk_user_logins_ip_hash
      check (ip_address_hash is null or ip_address_hash ~ '^[0-9a-f]{64}$');
  end if;
end;
$$;

create index if not exists ix_users_email_lookup
  on users(email_lookup);

create index if not exists ix_users_created_at
  on users(created_at desc);

alter table users enable row level security;
alter table sessions enable row level security;
alter table user_progress enable row level security;
alter table user_logins enable row level security;
alter table user_identities enable row level security;
alter table rate_limit_buckets enable row level security;

alter table users force row level security;
alter table sessions force row level security;
alter table user_progress force row level security;
alter table user_logins force row level security;
alter table user_identities force row level security;
alter table rate_limit_buckets force row level security;

revoke all on users from public;
revoke all on sessions from public;
revoke all on user_progress from public;
revoke all on user_logins from public;
revoke all on user_identities from public;
revoke all on rate_limit_buckets from public;
revoke all on sequence user_logins_id_seq from public;

revoke all on users from anon, authenticated;
revoke all on sessions from anon, authenticated;
revoke all on user_progress from anon, authenticated;
revoke all on user_logins from anon, authenticated;
revoke all on user_identities from anon, authenticated;
revoke all on rate_limit_buckets from anon, authenticated;
revoke all on sequence user_logins_id_seq from anon, authenticated;

grant select (id, email, full_name, avatar_url, provider, created_at, updated_at)
  on users to authenticated;
grant update (full_name, avatar_url, updated_at)
  on users to authenticated;

grant select, insert, update
  on user_progress to authenticated;

grant select, insert
  on user_logins to authenticated;
grant usage, select
  on sequence user_logins_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_own'
  ) then
    execute 'create policy users_select_own
      on users
      for select
      to authenticated
      using (id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    execute 'create policy users_update_own
      on users
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_progress' and policyname = 'user_progress_select_own'
  ) then
    execute 'create policy user_progress_select_own
      on user_progress
      for select
      to authenticated
      using (user_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_progress' and policyname = 'user_progress_insert_own'
  ) then
    execute 'create policy user_progress_insert_own
      on user_progress
      for insert
      to authenticated
      with check (user_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_progress' and policyname = 'user_progress_update_own'
  ) then
    execute 'create policy user_progress_update_own
      on user_progress
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_logins' and policyname = 'user_logins_select_own'
  ) then
    execute 'create policy user_logins_select_own
      on user_logins
      for select
      to authenticated
      using (user_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_logins' and policyname = 'user_logins_insert_own'
  ) then
    execute 'create policy user_logins_insert_own
      on user_logins
      for insert
      to authenticated
      with check (user_id = auth.uid())';
  end if;
end;
$$;
