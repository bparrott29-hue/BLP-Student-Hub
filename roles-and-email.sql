-- BLP Student Hub - Email + Role Setup
-- Run this once in Supabase > SQL Editor.

-- 1) Store each account email on its public profile.
alter table public.profiles
add column if not exists email text;

-- 2) Backfill emails for accounts that already exist.
update public.profiles as p
set email = u.email
from auth.users as u
where p.id = u.id
  and p.email is distinct from u.email;

-- 3) Keep the profile email synced when a new account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    'student',
    true
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

-- Make sure the signup trigger uses the function above.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- GIVE PEOPLE ROLES
-- Change the email address and role below, then run that line.
-- Valid roles: student, teacher, admin
-- ============================================================

-- Make someone an ADMIN:
-- update public.profiles set role = 'admin', active = true where lower(email) = lower('person@example.com');

-- Make someone a TEACHER:
-- update public.profiles set role = 'teacher', active = true where lower(email) = lower('person@example.com');

-- Make someone a STUDENT:
-- update public.profiles set role = 'student', active = true where lower(email) = lower('person@example.com');

-- Check everyone's current role:
select email, username, role, active
from public.profiles
order by role, email;
