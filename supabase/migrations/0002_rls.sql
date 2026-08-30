-- Enable RLS on tenant tables. Apply on hosted Supabase only.
-- Local PGlite does not set auth.uid(); the Next.js server still scopes every query.

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table invitations enable row level security;
alter table projects enable row level security;
alter table agents enable row level security;
alter table api_keys enable row level security;
alter table subscriptions enable row level security;
alter table errors enable row level security;
alter table agent_runs enable row level security;
alter table run_steps enable row level security;
alter table llm_calls enable row level security;
alter table tool_calls enable row level security;
alter table alerts enable row level security;
alter table alert_events enable row level security;
alter table usage_daily enable row level security;
alter table audit_logs enable row level security;
alter table profiles enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

create policy profiles_self on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy org_member_select on organizations
  for select using (public.is_org_member(id));

create policy org_member_update on organizations
  for update using (public.is_org_member(id));

create policy members_select on organization_members
  for select using (public.is_org_member(organization_id));

create policy invitations_member on invitations
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy projects_member on projects
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy agents_member on agents
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy api_keys_member on api_keys
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy subscriptions_member on subscriptions
  for select using (public.is_org_member(organization_id));

create policy errors_member on errors
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy runs_member on agent_runs
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy steps_member on run_steps
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy llm_member on llm_calls
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy tools_member on tool_calls
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy alerts_member on alerts
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy alert_events_member on alert_events
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy usage_member on usage_daily
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy audit_member on audit_logs
  for select using (public.is_org_member(organization_id));
