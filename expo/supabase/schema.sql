-- PropTrack Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/tfshawyalkvxmryjqbzh/sql)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'landlord' check (role in ('landlord', 'tenant')),
  plan text not null default 'starter' check (plan in ('starter', 'essential', 'pro')),
  dark_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- PROPERTIES
-- ============================================
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  address text not null default '',
  unit_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- UNITS
-- ============================================
create table if not exists public.units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  tenant_name text not null default '',
  tenant_phone text not null default '',
  tenant_email text not null default '',
  move_in_date text not null default '',
  is_occupied boolean not null default false,
  is_invited boolean not null default false,
  invited_at timestamptz,
  invite_code text,
  tenant_portal_active boolean not null default false,
  tenant_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================
-- MAINTENANCE REQUESTS
-- ============================================
create table if not exists public.maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references public.units(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  category text not null check (category in ('plumbing', 'electrical', 'hvac', 'appliance', 'other')),
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  photo_uri text,
  tenant_name text not null default '',
  unit_label text not null default '',
  property_name text not null default '',
  service_date text,
  requested_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- MESSAGES
-- ============================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.maintenance_requests(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  sender_name text not null default '',
  sender_role text not null default 'landlord' check (sender_role in ('landlord', 'tenant')),
  body text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================
-- EXPENSES
-- ============================================
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.maintenance_requests(id) on delete set null,
  property_id uuid references public.properties(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  description text not null default '',
  amount numeric(12,2) not null default 0,
  category text not null default 'other' check (category in ('repair', 'maintenance', 'upgrade', 'inspection', 'other')),
  date text not null default '',
  vendor text,
  receipt_uri text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- ACTIVITIES
-- ============================================
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null default '',
  subtitle text not null default '',
  related_id text,
  created_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.messages enable row level security;
alter table public.expenses enable row level security;
alter table public.activities enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Properties: owners can CRUD their properties
create policy "Owners can view own properties" on public.properties
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own properties" on public.properties
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own properties" on public.properties
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own properties" on public.properties
  for delete using (auth.uid() = owner_id);

-- Units: owners can CRUD their units
create policy "Owners can view own units" on public.units
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own units" on public.units
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own units" on public.units
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own units" on public.units
  for delete using (auth.uid() = owner_id);

-- Maintenance requests: owners can CRUD
create policy "Owners can view own requests" on public.maintenance_requests
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own requests" on public.maintenance_requests
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own requests" on public.maintenance_requests
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own requests" on public.maintenance_requests
  for delete using (auth.uid() = owner_id);

-- Messages: visible to request owner
create policy "Owners can view messages" on public.messages
  for select using (auth.uid() = sender_id or exists (
    select 1 from public.maintenance_requests mr where mr.id = request_id and mr.owner_id = auth.uid()
  ));

create policy "Users can insert messages" on public.messages
  for insert with check (auth.uid() = sender_id);

-- Expenses: owners can CRUD
create policy "Owners can view own expenses" on public.expenses
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own expenses" on public.expenses
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own expenses" on public.expenses
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own expenses" on public.expenses
  for delete using (auth.uid() = owner_id);

-- Activities: owners can view/insert
create policy "Owners can view own activities" on public.activities
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own activities" on public.activities
  for insert with check (auth.uid() = owner_id);

-- ============================================
-- TENANT RLS POLICIES
-- ============================================

-- Tenants can view their linked unit
create policy "Tenants can view own unit" on public.units
  for select using (auth.uid() = tenant_user_id);

-- Tenants can view the property their unit belongs to
create policy "Tenants can view unit property" on public.properties
  for select using (exists (
    select 1 from public.units u where u.property_id = id and u.tenant_user_id = auth.uid()
  ));

-- Tenants can view requests for their unit
create policy "Tenants can view unit requests" on public.maintenance_requests
  for select using (exists (
    select 1 from public.units u where u.id = unit_id and u.tenant_user_id = auth.uid()
  ));

-- Tenants can insert requests for their unit
create policy "Tenants can insert requests" on public.maintenance_requests
  for insert with check (exists (
    select 1 from public.units u where u.id = unit_id and u.tenant_user_id = auth.uid()
  ));

-- Tenants can view messages on their requests
create policy "Tenants can view request messages" on public.messages
  for select using (exists (
    select 1 from public.maintenance_requests mr
    join public.units u on u.id = mr.unit_id
    where mr.id = request_id and u.tenant_user_id = auth.uid()
  ));

-- Tenants can send messages on their requests
create policy "Tenants can insert messages" on public.messages
  for insert with check (auth.uid() = sender_id and exists (
    select 1 from public.maintenance_requests mr
    join public.units u on u.id = mr.unit_id
    where mr.id = request_id and u.tenant_user_id = auth.uid()
  ));

-- Tenants can update their own unit (for linking tenant_user_id)
create policy "Tenants can update own unit" on public.units
  for update using (
    auth.uid() = tenant_user_id
    or (is_invited = true and invite_code is not null)
  );

-- ============================================
-- ENABLE REALTIME for messages table
-- ============================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.maintenance_requests;

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- INDEXES for performance
-- ============================================
create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_units_property on public.units(property_id);
create index if not exists idx_units_owner on public.units(owner_id);
create index if not exists idx_requests_property on public.maintenance_requests(property_id);
create index if not exists idx_requests_unit on public.maintenance_requests(unit_id);
create index if not exists idx_requests_owner on public.maintenance_requests(owner_id);
create index if not exists idx_messages_request on public.messages(request_id);
create index if not exists idx_expenses_property on public.expenses(property_id);
create index if not exists idx_expenses_owner on public.expenses(owner_id);
create index if not exists idx_activities_owner on public.activities(owner_id);
create index if not exists idx_units_invite_code on public.units(invite_code);
create index if not exists idx_units_tenant_user on public.units(tenant_user_id);

-- ============================================
-- RPC: Verify invite code (bypasses RLS for lookup)
-- ============================================
create or replace function public.verify_invite_code(invite_code_input text)
returns json as $
declare
  found_unit record;
begin
  select id, property_id, label, tenant_name
  into found_unit
  from public.units
  where invite_code = upper(trim(invite_code_input))
  and is_invited = true
  limit 1;

  if found_unit.id is null then
    return null;
  end if;

  return json_build_object(
    'id', found_unit.id,
    'property_id', found_unit.property_id,
    'label', found_unit.label,
    'tenant_name', found_unit.tenant_name
  );
end;
$ language plpgsql security definer;
