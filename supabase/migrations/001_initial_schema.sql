-- Civic Guard — Initial Schema (Supabase / Postgres)
-- Multi-tenant SaaS: organizations -> departments -> users -> complaints
-- Run: supabase db push  (or paste into Supabase SQL editor)

-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ============ ENUMS ============
do $$ begin create type user_role as enum (
  'super_admin','org_admin','dept_head','dept_admin','field_officer','citizen'
); exception when duplicate_object then null; end $$;

do $$ begin create type account_status as enum (
  'pending','active','suspended','disabled'
); exception when duplicate_object then null; end $$;

do $$ begin create type complaint_status as enum (
  'submitted','under_verification','verified','assigned','in_progress',
  'resolved','citizen_confirmation','closed','rejected','reopened','escalated'
); exception when duplicate_object then null; end $$;

do $$ begin create type complaint_priority as enum (
  'low','medium','high','critical'
); exception when duplicate_object then null; end $$;

-- ============ ORGANIZATIONS (tenants) ============
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#0B6E4F',
  contact_email text,
  contact_phone text,
  address text,
  is_active boolean default true,
  reward_config jsonb default '{"points_per_valid_report":10,"points_per_confirmation":5,"min_points_redeem":100}'::jsonb,
  notification_config jsonb default '{"email":true,"sms":false,"push":true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ REGIONS (state > district > city > ward) ============
create table if not exists regions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  type text not null check (type in ('state','district','city','ward')),
  name text not null,
  parent_id uuid references regions(id) on delete cascade,
  boundary geography(MultiPolygon,4326),
  created_at timestamptz default now()
);
create index if not exists idx_regions_org on regions(org_id);
create index if not exists idx_regions_parent on regions(parent_id);

-- ============ DEPARTMENTS ============
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  head_id uuid,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(org_id, code)
);

-- ============ CATEGORIES (with SLA) ============
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  icon text default 'alert',
  default_department_id uuid references departments(id),
  sla_hours integer not null default 48,
  critical_sla_hours integer default 6,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(org_id, slug)
);

-- ============ PROFILES (extends auth.users) ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  role user_role not null default 'citizen',
  status account_status not null default 'active',
  full_name text,
  employee_id text,
  email text,
  phone text,
  avatar_url text,
  department_id uuid references departments(id),
  region_id uuid references regions(id),
  reward_points integer default 0,
  failed_login_attempts integer default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, employee_id)
);
create index if not exists idx_profiles_org_role on profiles(org_id, role);
create index if not exists idx_profiles_dept on profiles(department_id);

-- ============ COMPLAINTS ============
create table if not exists complaints (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  complaint_code text unique,
  citizen_id uuid not null references profiles(id),
  category_id uuid references categories(id),
  department_id uuid references departments(id),
  assigned_officer_id uuid references profiles(id),
  title text not null check (char_length(title) >= 5),
  description text not null,
  location geography(Point,4326),
  latitude double precision,
  longitude double precision,
  address text,
  region_id uuid references regions(id),
  status complaint_status not null default 'submitted',
  priority complaint_priority not null default 'medium',
  severity integer default 3 check (severity between 1 and 5),
  sla_due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  duplicate_of uuid references complaints(id),
  upvotes integer default 1,
  ai_analysis jsonb default '{}'::jsonb,
  escalation_level integer default 0,
  citizen_rating integer check (citizen_rating between 1 and 5),
  citizen_feedback text,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_complaints_org_status on complaints(org_id, status);
create index if not exists idx_complaints_citizen on complaints(citizen_id);
create index if not exists idx_complaints_officer on complaints(assigned_officer_id);
create index if not exists idx_complaints_location on complaints using gist(location);
create index if not exists idx_complaints_code on complaints(complaint_code);
create index if not exists idx_complaints_sla on complaints(sla_due_at) where status not in ('closed','resolved','rejected');

-- Auto-generate CG-YYYY-00001 codes
create or replace function generate_complaint_code()
returns trigger as $$
declare yr text := to_char(now(),'YYYY'); seq int;
begin
  select count(*)+1 into seq from complaints
    where complaint_code like 'CG-'||yr||'-%' and org_id = new.org_id;
  new.complaint_code := 'CG-'||yr||'-'||lpad(seq::text,5,'0');
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_complaint_code on complaints;
create trigger trg_complaint_code before insert on complaints
  for each row when (new.complaint_code is null) execute function generate_complaint_code();

-- Auto-set SLA on insert
create or replace function set_complaint_sla()
returns trigger as $$
declare hrs int;
begin
  select coalesce(critical_sla_hours, sla_hours) into hrs from categories where id = new.category_id;
  if new.priority = 'critical' then
    new.sla_due_at := coalesce(new.sla_due_at, now() + (coalesce(hrs,6) || ' hours')::interval);
  else
    select sla_hours into hrs from categories where id = new.category_id;
    new.sla_due_at := coalesce(new.sla_due_at, now() + (coalesce(hrs,48) || ' hours')::interval);
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_complaint_sla on complaints;
create trigger trg_complaint_sla before insert on complaints
  for each row when (new.sla_due_at is null) execute function set_complaint_sla();

-- ============ COMPLAINT IMAGES ============
create table if not exists complaint_images (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  storage_path text not null,
  image_type text default 'report' check (image_type in ('report','progress','before','after','proof')),
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============ COMPLAINT HISTORY / TIMELINE ============
create table if not exists complaint_history (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  actor_id uuid references profiles(id),
  from_status complaint_status,
  to_status complaint_status,
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_history_complaint on complaint_history(complaint_id);

-- ============ UPVOTES (support instead of duplicate) ============
create table if not exists complaint_supports (
  complaint_id uuid references complaints(id) on delete cascade,
  citizen_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (complaint_id, citizen_id)
);

-- ============ REWARDS ============
create table if not exists reward_transactions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  citizen_id uuid not null references profiles(id) on delete cascade,
  complaint_id uuid references complaints(id),
  points integer not null,
  type text not null check (type in ('earn','redeem','adjust','penalty')),
  status text default 'approved' check (status in ('pending','approved','rejected')),
  reason text,
  created_at timestamptz default now()
);

-- ============ NOTIFICATIONS ============
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  complaint_id uuid references complaints(id) on delete cascade,
  title text not null,
  body text,
  channel text default 'in_app' check (channel in ('in_app','push','email','sms')),
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notif_user on notifications(user_id, is_read);

-- ============ AUDIT LOGS ============
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_org on audit_logs(org_id, created_at desc);

-- ============ LOGIN ACTIVITY ============
create table if not exists login_activity (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  success boolean not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- ============ CHAT (chatbot history) ============
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- ============ STORAGE BUCKETS ============
insert into storage.buckets (id, name, public) values
  ('complaint-photos','complaint-photos', true),
  ('avatars','avatars', true),
  ('resolution-proofs','resolution-proofs', false)
on conflict (id) do nothing;

-- ============ RLS ============
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table complaints enable row level security;
alter table complaint_images enable row level security;
alter table complaint_history enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table reward_transactions enable row level security;

-- Service role bypasses RLS; authenticated policies (simplified, backend enforces fine-grained RBAC):
create policy "authenticated read orgs" on organizations for select to authenticated using (true);
create policy "users read own profile" on profiles for select to authenticated using (auth.uid() = id);
create policy "users update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "authenticated read complaints" on complaints for select to authenticated using (true);
create policy "citizens insert complaints" on complaints for insert to authenticated with check (auth.uid() = citizen_id);
create policy "authenticated read images" on complaint_images for select to authenticated using (true);
create policy "authenticated insert images" on complaint_images for insert to authenticated with check (true);
create policy "authenticated read history" on complaint_history for select to authenticated using (true);
create policy "authenticated insert history" on complaint_history for insert to authenticated with check (true);
create policy "users read own notifications" on notifications for select to authenticated using (auth.uid() = user_id);

-- Storage policies
create policy "public read complaint photos" on storage.objects for select using (bucket_id = 'complaint-photos');
create policy "auth upload complaint photos" on storage.objects for insert to authenticated with check (bucket_id in ('complaint-photos','avatars','resolution-proofs'));

-- ============ SEED: default org + categories ============
insert into organizations (name, slug, contact_email) values
  ('Demo Municipality','demo-municipality','admin@demo.gov')
on conflict (slug) do nothing;

-- ============ AUTO-CREATE PROFILE ON AUTH.USERS SIGNUP ============
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_org uuid;
begin
  select id into default_org from public.organizations where slug = 'demo-municipality' limit 1;
  insert into public.profiles (id, org_id, role, status, full_name, email)
  values (
    new.id,
    default_org,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'citizen'::public.user_role),
    'active'::public.account_status,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

