-- ============================================================
-- 培訓權限與作業管理系統
-- ============================================================

-- 1. courses 表新增 visibility 欄位
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN visibility text DEFAULT 'all';
    ALTER TABLE public.courses ADD CONSTRAINT courses_visibility_check
      CHECK (visibility IN ('all', 'intern', 'formal'));
  END IF;
END $$;

-- 2. lessons 表新增 requires_assignment + assignment_for 欄位
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'requires_assignment'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN requires_assignment boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'assignment_for'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN assignment_for text DEFAULT 'all';
    ALTER TABLE public.lessons ADD CONSTRAINT lessons_assignment_for_check
      CHECK (assignment_for IN ('all', 'intern', 'formal'));
  END IF;
END $$;

-- 3. assignments 表新增 video_url 欄位 (YouTube 連結)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN video_url text;
  END IF;
END $$;
