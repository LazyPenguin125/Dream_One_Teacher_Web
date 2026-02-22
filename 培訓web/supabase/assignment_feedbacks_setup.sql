-- =============================================
-- assignment_feedbacks：作業回饋討論串
-- 允許多位輔導員/管理員對同一份作業留下多則回饋
-- =============================================

CREATE TABLE IF NOT EXISTS public.assignment_feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignment_feedbacks_assignment
  ON public.assignment_feedbacks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_feedbacks_created
  ON public.assignment_feedbacks(created_at);

ALTER TABLE public.assignment_feedbacks ENABLE ROW LEVEL SECURITY;

-- 所有登入用戶可讀取回饋（講師需看到自己作業的回饋）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_feedbacks' AND policyname = 'Anyone can read feedbacks') THEN
    CREATE POLICY "Anyone can read feedbacks" ON public.assignment_feedbacks
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 輔導員/管理員可新增回饋
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_feedbacks' AND policyname = 'Staff can insert feedbacks') THEN
    CREATE POLICY "Staff can insert feedbacks" ON public.assignment_feedbacks
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
          AND role IN ('admin', 'mentor')
        )
      );
  END IF;
END $$;

-- 回饋者可刪除自己的回饋
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_feedbacks' AND policyname = 'Author can delete own feedback') THEN
    CREATE POLICY "Author can delete own feedback" ON public.assignment_feedbacks
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 管理員可刪除任何回饋
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_feedbacks' AND policyname = 'Admin can delete any feedback') THEN
    CREATE POLICY "Admin can delete any feedback" ON public.assignment_feedbacks
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;
