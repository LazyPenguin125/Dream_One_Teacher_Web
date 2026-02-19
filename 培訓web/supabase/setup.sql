/* Teacher Training Platform - Database Setup (Supabase / PostgreSQL) */

-- 1. users (使用者) - Extend Supabase Auth users
create table users (
  id uuid references auth.users not null primary key,
  name text,
  email text,
  role text check (role in ('teacher', 'admin')) default 'teacher',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table users enable row level security;

-- 2. courses (課程)
create table courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_published boolean default false,
  "order" int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table courses enable row level security;

-- 3. lessons (章節)
create table lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  "order" int default 0,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table lessons enable row level security;

-- 4. contents (內容)
create table contents (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid references lessons(id) on delete cascade not null,
  type text check (type in ('article', 'video')) not null,
  title text not null,
  body text, -- for article
  video_url text, -- for video
  "order" int default 0,
  status text check (status in ('draft', 'published', 'archived')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table contents enable row level security;

-- 5. progress (學習進度)
create table progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  completed boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, lesson_id)
);

alter table progress enable row level security;

-- 6. assignments (作業)
create table assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  type text check (type in ('video', 'text')) not null,
  content text, -- for text type (心得)
  file_url text, -- for video file (storage link)
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table assignments enable row level security;

-- 7. Sync Supabase Auth Users with public.users table automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'teacher')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies Setup (Example basics)

-- RLS Policies Setup

-- Users Table: 允許使用者讀取自己的資料，允許管理員讀取所有資料
create policy "Users can view own profile" on public.users for select using (
  auth.uid() = id
);
create policy "Admins can view all profiles" on public.users for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all profiles" on public.users for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Courses Table: 管理員可做任何事，教師可讀取已發佈課程
create policy "Admins can do everything on courses" on courses for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Everyone can view published courses" on courses for select using (
  is_published = true
);

-- Lessons Table: 管理員可做任何事，教師可讀取已發佈章節
create policy "Admins can do everything on lessons" on lessons for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Everyone can view published lessons" on lessons for select using (
  is_published = true
);

-- Contents Table: 管理員可做任何事，教師可讀取章節內容
create policy "Admins can do everything on contents" on contents for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Everyone can view contents" on contents for select using (
  true
);

-- Progress Table: 教師可管理自己的進度，管理員可檢視所有進度
create policy "Users can view own progress" on progress for select using (
  auth.uid() = user_id
);
create policy "Users can insert own progress" on progress for insert with check (
  auth.uid() = user_id
);
create policy "Users can update own progress" on progress for update using (
  auth.uid() = user_id
);
create policy "Admins can do everything on progress" on progress for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Assignments Table: 教師可繳交與查看自己的作業，管理員可管理所有作業
create policy "Users can view own assignments" on assignments for select using (
  auth.uid() = user_id
);
create policy "Users can insert own assignments" on assignments for insert with check (
  auth.uid() = user_id
);
create policy "Admins can do everything on assignments" on assignments for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Note: You should update the roles manually in the users table for admins.
