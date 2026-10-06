-- ⚠️ Repart de zéro : efface les anciennes tables du projet (si tu en as déjà créé).
-- BLOC 1 : nettoyage + tables
drop table if exists cards, items, members, projects cascade;
drop function if exists is_member(uuid) cascade;
drop function if exists add_owner() cascade;
drop function if exists invite(uuid, text) cascade;
create table projects(id uuid primary key default gen_random_uuid(), name text not null, owner uuid default auth.uid());
create table members(project_id uuid references projects on delete cascade, user_id uuid references auth.users on delete cascade, primary key(project_id,user_id));
create table items(id uuid primary key default gen_random_uuid(), project_id uuid references projects on delete cascade, parent_id uuid references items on delete cascade, type text check(type in('folder','page','board','pdf')), title text default 'Sans titre', color text, closed boolean default false, ydoc text, created_at timestamptz default now());
create table cards(id uuid primary key default gen_random_uuid(), item_id uuid references items on delete cascade, project_id uuid references projects on delete cascade, title text, col text default 'todo', created_at timestamptz default now());

-- BLOC 2 : fonctions et trigger
create function is_member(p uuid) returns boolean language sql security definer stable as $$ select exists(select 1 from members where project_id=p and user_id=auth.uid()) $$;
create function add_owner() returns trigger language plpgsql security definer as $$ begin insert into members values(new.id,new.owner); return new; end $$;
create trigger t_owner after insert on projects for each row execute function add_owner();
create function invite(p_pid uuid, p_mail text) returns void language plpgsql security definer as $$
declare u uuid; begin
 if not is_member(p_pid) then raise exception 'Accès refusé'; end if;
 select id into u from auth.users where lower(email)=lower(p_mail);
 if u is null then raise exception 'Aucun compte avec cet email'; end if;
 insert into members values(p_pid,u) on conflict do nothing; end $$;

-- BLOC 3 : sécurité
alter table projects enable row level security;
alter table members enable row level security;
alter table items enable row level security;
alter table cards enable row level security;
create policy p_sel on projects for select using(owner=auth.uid() or is_member(id));
create policy p_ins on projects for insert with check(owner=auth.uid());
create policy m_sel on members for select using(is_member(project_id));
create policy i_all on items for all using(is_member(project_id)) with check(is_member(project_id));
create policy c_all on cards for all using(is_member(project_id)) with check(is_member(project_id));

-- BLOC 4 : temps réel
alter table items replica identity full;
alter table cards replica identity full;
alter publication supabase_realtime add table items, cards;

-- BLOC 5 : stockage des PDF
insert into storage.buckets(id,name,public) values('pdfs','pdfs',false) on conflict do nothing;
drop policy if exists pdf_all on storage.objects;
create policy pdf_all on storage.objects for all
 using(bucket_id='pdfs' and public.is_member(((storage.foldername(name))[1])::uuid))
 with check(bucket_id='pdfs' and public.is_member(((storage.foldername(name))[1])::uuid));
