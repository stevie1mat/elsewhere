begin;
create table if not exists public.resident_saves (
  id text primary key,
  checkpoint jsonb not null check (checkpoint->>'version' = '1'),
  saved_at timestamptz not null default now()
);
create table if not exists public.resident_events (
  resident_id text not null references public.resident_saves(id),
  event_key text not null,
  occurred_at timestamptz not null,
  message text not null,
  primary key (resident_id,event_key)
);
create table if not exists public.resident_messages (
  resident_id text not null references public.resident_saves(id),
  message_key text not null,
  occurred_at timestamptz not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  primary key (resident_id,message_key)
);
alter table public.resident_saves enable row level security;
alter table public.resident_events enable row level security;
alter table public.resident_messages enable row level security;
revoke all on public.resident_saves,public.resident_events,public.resident_messages from anon,authenticated;
grant all on public.resident_saves,public.resident_events,public.resident_messages to service_role;
create or replace function public.save_resident(p_id text,p_checkpoint jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare written text;
begin
  insert into public.resident_saves(id,checkpoint,saved_at) values(p_id,p_checkpoint,now())
  on conflict(id) do update set checkpoint=excluded.checkpoint,saved_at=excluded.saved_at
  where coalesce((resident_saves.checkpoint->>'updatedAt')::bigint,0)<=coalesce((excluded.checkpoint->>'updatedAt')::bigint,0)
  returning id into written;
  if written is null then return; end if;
  insert into public.resident_events(resident_id,event_key,occurred_at,message)
  select p_id,md5(e::text),to_timestamp((e->>'at')::double precision/1000),e->>'message'
  from jsonb_array_elements(coalesce(p_checkpoint->'events','[]'::jsonb)) e
  on conflict do nothing;
  insert into public.resident_messages(resident_id,message_key,occurred_at,role,content)
  select p_id,md5(m::text),to_timestamp((m->>'at')::double precision/1000),m->>'role',m->>'content'
  from jsonb_array_elements(coalesce(p_checkpoint->'messages','[]'::jsonb)) m
  on conflict do nothing;
end;
$$;
revoke all on function public.save_resident(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_resident(text,jsonb) to service_role;
commit;
