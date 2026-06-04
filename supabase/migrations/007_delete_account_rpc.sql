-- Phase 7: delete_account RPC
-- Deletes all data belonging to the authenticated user and removes the auth record.
-- Run in the Supabase dashboard SQL Editor.

create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Delete user data from all public tables (order matters for FK constraints).
  delete from fact_reports       where user_id = v_user_id;
  delete from notification_events where user_id = v_user_id;
  delete from quiz_attempts       where user_id = v_user_id;
  delete from fact_assignments    where user_id = v_user_id;
  delete from saved_words         where user_id = v_user_id;
  delete from profiles            where id       = v_user_id;

  -- Remove the auth user record. The function runs as the definer (postgres role)
  -- which has access to the auth schema in Supabase.
  delete from auth.users where id = v_user_id;
end $$;

grant execute on function delete_account() to authenticated;
