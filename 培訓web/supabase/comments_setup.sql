-- ============================================================
-- lesson_comments：章節留言討論區
-- ============================================================

-- 建表
create table if not exists lesson_comments (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid references lessons(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz default now() not null
);

alter table lesson_comments enable row level security;

-- RLS：所有登入用戶可讀取留言（公開討論）
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone can read lesson comments' and tablename = 'lesson_comments') then
    create policy "Anyone can read lesson comments"
      on lesson_comments for select
      using (auth.uid() is not null);
  end if;
end $$;

-- RLS：用戶只能新增自己的留言
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own comments' and tablename = 'lesson_comments') then
    create policy "Users can insert own comments"
      on lesson_comments for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- RLS：用戶可以刪除自己的留言
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own comments' and tablename = 'lesson_comments') then
    create policy "Users can delete own comments"
      on lesson_comments for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- RLS：管理員可執行所有操作
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins full access on lesson comments' and tablename = 'lesson_comments') then
    create policy "Admins full access on lesson comments"
      on lesson_comments for all
      using (
        exists (select 1 from public.users where id = auth.uid() and role = 'admin')
      );
  end if;
end $$;

-- 索引加速查詢
create index if not exists idx_lesson_comments_lesson_id on lesson_comments(lesson_id);
create index if not exists idx_lesson_comments_created_at on lesson_comments(created_at);
