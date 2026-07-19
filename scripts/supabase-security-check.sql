select
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
from pg_class
where relname in ('users', 'sessions', 'user_progress', 'user_logins')
order by relname;

select
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'sessions', 'user_progress', 'user_logins')
order by tablename, policyname;

select
  table_name,
  constraint_name,
  constraint_type
from information_schema.table_constraints
where table_schema = 'public'
  and table_name in ('users', 'sessions', 'user_progress', 'user_logins')
order by table_name, constraint_name;

select
  id,
  email,
  provider,
  case
    when password_hash is null then 'NULL'
    when password_hash like '$argon2id$%' then 'ARGON2ID_HASHED'
    else 'CHECK_NEEDED'
  end as password_state,
  case
    when phone_encrypted is null then 'NULL'
    when phone_encrypted like 'enc:v1:%' then 'AES_GCM_ENCRYPTED'
    else 'CHECK_NEEDED'
  end as phone_state,
  case
    when address_encrypted is null then 'NULL'
    when address_encrypted like 'enc:v1:%' then 'AES_GCM_ENCRYPTED'
    else 'CHECK_NEEDED'
  end as address_state,
  created_at,
  updated_at
from users
order by updated_at desc;
