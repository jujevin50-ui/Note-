-- Historique partagé des ouvertures de documents (migration non destructive).
alter table public.items add column if not exists last_opened_at timestamptz;
create index if not exists items_recent_documents_idx on public.items(project_id, last_opened_at desc) where last_opened_at is not null;

create or replace function public.record_document_open(p_item_id uuid)
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare opened timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  update public.items set last_opened_at = greatest(coalesce(last_opened_at, '-infinity'::timestamptz), clock_timestamp())
  where id = p_item_id and type in ('page', 'pdf') and public.is_member(project_id)
  returning last_opened_at into opened;
  return opened;
end;
$$;

create or replace function public.recent_documents(p_project_id uuid, p_space text)
returns table(id uuid, last_opened_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select i.id, i.last_opened_at from public.items i
  where i.project_id = p_project_id and public.is_member(i.project_id)
    and coalesce(i.space, 'notes') = p_space and i.type in ('page', 'pdf') and i.last_opened_at is not null
  order by i.last_opened_at desc, i.id limit 3;
$$;
revoke all on function public.record_document_open(uuid) from public, anon;
revoke all on function public.recent_documents(uuid, text) from public, anon;
grant execute on function public.record_document_open(uuid) to authenticated;
grant execute on function public.recent_documents(uuid, text) to authenticated;
