-- =====================================================
-- SAC Skill Tracker - Fresh Schema
-- Super admin is GLOBAL and can only create organizations
-- =====================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- 1) Global super admin users
-- -----------------------------
create table if not exists super_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------
-- 2) Organizations
-- -----------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

-- -----------------------------
-- 3) Org-scoped users
-- -----------------------------
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists instructors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- -----------------------------
-- 4) Members / classes
-- -----------------------------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text not null,
  level text,
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  schedule text,
  length_minutes int check (length_minutes is null or length_minutes > 0),
  created_at timestamptz not null default now()
);

create table if not exists class_instructors (
  class_id uuid not null references classes(id) on delete cascade,
  instructor_id uuid not null references instructors(id) on delete cascade,
  primary key (class_id, instructor_id)
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (class_id, member_id)
);

create table if not exists guardian_members (
  guardian_id uuid not null references guardians(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (guardian_id, member_id)
);

-- -----------------------------
-- 5) Skills + evaluations
-- -----------------------------
create table if not exists skill_definitions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  unique (org_id, name)
);

create table if not exists member_skills (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  skill_id uuid not null references skill_definitions(id) on delete cascade,
  progress int not null default 0 check (progress between 0 and 100),
  date_acquired date,
  updated_by_instructor_id uuid references instructors(id) on delete set null,
  unique (member_id, skill_id)
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  instructor_id uuid references instructors(id) on delete set null,
  evaluation_date date not null default current_date,
  feedback text,
  created_at timestamptz not null default now()
);

-- -----------------------------
-- 6) Helpful indexes
-- -----------------------------
create index if not exists idx_members_org on members(org_id);
create index if not exists idx_classes_org on classes(org_id);
create index if not exists idx_member_skills_member on member_skills(member_id);
create index if not exists idx_evaluations_member on evaluations(member_id);

-- -----------------------------
-- 7) RLS: super admin can create orgs only
-- -----------------------------
alter table organizations enable row level security;

create policy orgs_select_authenticated
on organizations
for select
to authenticated
using (true);

create policy orgs_insert_super_admin_only
on organizations
for insert
to authenticated
with check (
  exists (
    select 1
    from super_admin_users s
    where s.user_id = auth.uid()
  )
);

create policy orgs_no_update
on organizations
for update
to authenticated
using (false)
with check (false);

create policy orgs_no_delete
on organizations
for delete
to authenticated
using (false);

-- Optional hardening: force RLS for all users except table owner/service_role
alter table organizations force row level security;
