-- ============================================================
-- 1. lesson_comment_likes：留言按讚
-- ============================================================

create table if not exists lesson_comment_likes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references lesson_comments(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  created_at timestamptz default now() not null,
  unique (comment_id, user_id)
);

alter table lesson_comment_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone can read comment likes' and tablename = 'lesson_comment_likes') then
    create policy "Anyone can read comment likes"
      on lesson_comment_likes for select
      using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can like comments' and tablename = 'lesson_comment_likes') then
    create policy "Users can like comments"
      on lesson_comment_likes for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can unlike comments' and tablename = 'lesson_comment_likes') then
    create policy "Users can unlike comments"
      on lesson_comment_likes for delete
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_comment_likes_comment on lesson_comment_likes(comment_id);
create index if not exists idx_comment_likes_user    on lesson_comment_likes(user_id);


-- ============================================================
-- 2. instructors 表新增 nickname 欄位
-- ============================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructors' and column_name = 'nickname'
  ) then
    alter table public.instructors add column nickname text;
  end if;
end $$;
