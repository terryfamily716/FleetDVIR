-- FleetDVIR Supabase Migration Schema
-- Maps Firestore collections to Postgres tables with RLS
-- No credit card required on Supabase free tier

create extension if not exists "uuid-ossp";

-- TENANTS (multi-tenancy: Ralphs = tenant 1)
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  subscription_tier text default 'free',
  driver_count int default 0,
  custom_domain text,
  created_at timestamptz default now()
);

insert into tenants (id, name, subscription_tier, driver_count)
values ('11111111-1111-1111-1111-111111111111', 'Ralph''s Grocery', 'free', 0);

-- PROFILES (replaces Firestore drivers collection + Firebase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  first_name text not null,
  last_name text not null,
  selfie_url text,
  badge_status text not null default 'pending' check (badge_status in ('pending','approved','rejected')),
  role text not null default 'driver' check (role in ('driver','supervisor','shop','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DVIRs (replaces Firestore dvirs collection)
create table dvirs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  driver_id uuid not null references profiles(id),
  tractor_number text not null,
  trailer_number text,
  odometer int not null,
  inspection_type text not null check (inspection_type in ('pre','post')),
  status text not null default 'incomplete' check (status in ('incomplete','pass','fail','out_of_service')),
  unsafe_to_drive boolean default false,
  driver_signature text,
  mechanic_signature text,
  mechanic_signed_at timestamptz,
  supervisor_signature text,
  supervisor_signed_at timestamptz,
  submitted boolean default false,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DEFECTS (replaces dvirs/{id}/defects subcollection)
create table defects (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  dvir_id uuid not null references dvirs(id) on delete cascade,
  item text not null,
  result text not null check (result in ('pass','fail')),
  out_of_service boolean default false,
  photo_url text,
  shop_notes text,
  resolved boolean default false,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- BODY DAMAGE PHOTOS (replaces Storage dvirs/{id}/body-damage)
create table body_damage_photos (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  dvir_id uuid not null references dvirs(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz default now()
);

-- CHAT MESSAGES (replaces Firestore chat)
create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  sender_id uuid not null references profiles(id),
  group_id text,
  recipient_id uuid references profiles(id),
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- CHAT GROUPS
create table chat_groups (
  id text primary key,
  tenant_id uuid not null references tenants(id) default '11111111-1111-1111-1111-111111111111',
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table chat_group_members (
  group_id text not null references chat_groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (group_id, profile_id)
);

-- INDEXES
create index idx_profiles_tenant on profiles(tenant_id);
create index idx_profiles_badge on profiles(badge_status);
create index idx_dvirs_tenant on dvirs(tenant_id);
create index idx_dvirs_driver on dvirs(driver_id);
create index idx_dvirs_tractor on dvirs(tractor_number);
create index idx_dvirs_created on dvirs(created_at);
create index idx_defects_dvir on defects(dvir_id);
create index idx_chat_tenant on chat_messages(tenant_id);
create index idx_chat_group on chat_messages(group_id);
create index idx_chat_created on chat_messages(created_at);

-- ROW LEVEL SECURITY
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table dvirs enable row level security;
alter table defects enable row level security;
alter table body_damage_photos enable row level security;
alter table chat_messages enable row level security;
alter table chat_groups enable row level security;
alter table chat_group_members enable row level security;

create or replace function my_tenant() returns uuid as $$
  select tenant_id from profiles where id = auth.uid()
$$ language sql stable;

create policy tenants_read on tenants for select using (id = my_tenant());

create policy profiles_own on profiles for select using (id = auth.uid());
create policy profiles_tenant on profiles for select using (tenant_id = my_tenant() and badge_status = 'approved);
create policy profiles_insert on profiles for insert with check (id = auth.uid() and badge_status = 'pending' and role = 'driver);
create policy profiles_update_admin on profiles for update using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.tenant_id = profiles.tenant_id));

create policy dvirs_read on dvirs for select using (tenant_id = my_tenant() and (driver_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('supervisor','shop','admin') and p.badge_status = 'approved'));
create policy dvirs_insert on dvirs for insert with check (driver_id = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.badge_status = 'approved' and p.role = 'driver'));
create policy dvirs_update_own_draft on dvirs for update using (driver_id = auth.uid() and submitted = false);

create policy defects_read on defects for select using (tenant_id = my_tenant() and (exists (select 1 from dvirs d where d.id = defects.dvir_id and d.driver_id = auth.uid()) or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('shop','admin','supervisor') and p.badge_status = 'approved'));
create policy defects_update_shop on defects for update using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('shop','admin') and p.badge_status = 'approved'));

create policy photos_read on body_damage_photos for select using (tenant_id = my_tenant() and (exists (select 1 from dvirs d where d.id = body_damage_photos.dvir_id and d.driver_id = auth.uid()) or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('supervisor','shop','admin') and p.badge_status = 'approved'));
create policy photos_insert on body_damage_photos for insert with check (exists (select 1 from dvirs d where d.id = body_damage_photos.dvir_id and d.driver_id = auth.uid() and d.submitted = false));

create policy chat_read on chat_messages for select using (tenant_id = my_tenant() and exists (select 1 from profiles p where p.id = auth.uid() and p.badge_status = 'approved') and (recipient_id = auth.uid() or exists (select 1 from chat_group_members m where m.group_id = chat_messages.group_id and m.profile_id = auth.uid()) or sender_id = auth.uid());
create policy chat_insert on chat_messages for insert with check (sender_id = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.badge_status = 'approved') and (recipient_id is null or recipient_id in (select profile_id from chat_group_members where group_id = chat_messages.group_id)));

create policy groups_read on chat_groups for select using (tenant_id = my_tenant() and exists (select 1 from chat_group_members m where m.group_id = chat_groups.id and m.profile_id = auth.uid());
create policy groups_insert on chat_groups for insert with check (created_by = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.badge_status = 'approved'));

create policy group_members_read on chat_group_members for select using (exists (select 1 from chat_group_members m where m.group_id = chat_group_members.group_id and m.profile_id = auth.uid());
create policy group_members_insert on chat_group_members for insert with check (exists (select 1 from chat_groups g where g.id = chat_group_members.group_id and g.created_by = auth.uid());

-- STORAGE: create buckets in Supabase dashboard, then run:
-- create policy selfies_own on storage.objects for all using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy body_damage_own on storage.objects for all using (bucket_id = 'body-damage' and (storage.foldername(name))[1] = auth.uid()::text);

-- FMCSA 90-DAY RETENTION: schedule via pg_cron or Edge Function:
-- delete from dvirs where created_at < now() - interval '90 days';
-- delete from defects where created_at < now() - interval '90 days';
-- delete from body_damage_photos where created_at < now() - interval '90 days';
-- delete from chat_messages where created_at < now() - interval '90 days';
